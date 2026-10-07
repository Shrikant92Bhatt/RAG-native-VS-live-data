import { db } from '../db/client';
import { logger } from '../observability/logger';
import { SEED_DOCUMENTS } from '../db/seed';
import { vectorRetriever } from './vector';
import { nanoid } from 'nanoid';

export interface IngestedDocument {
  id: string;
  title: string;
  provider: string;
  author: string;
  url?: string;
  chunkCount: number;
  createdAt: string;
  chunks: string[];
}

export function chunkText(text: string, chunkSize = 500, overlap = 100): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (clean.length <= chunkSize) {
    return [clean];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = start + chunkSize;
    if (end < clean.length) {
      // Find nearest space or newline to avoid cutting words
      const lastBreak = clean.lastIndexOf('\n', end);
      const lastSpace = clean.lastIndexOf(' ', end);
      const naturalBreak = Math.max(lastBreak, lastSpace);
      if (naturalBreak > start + chunkSize / 2) {
        end = naturalBreak;
      }
    } else {
      end = clean.length;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start = end - overlap;
    if (start >= clean.length - overlap) break;
  }

  return chunks;
}

export async function ingestDocument(
  tenantId: string,
  title: string,
  content: string,
  author = 'Uploaded File',
  provider = 'upload'
): Promise<IngestedDocument> {
  const docId = `doc_up_${nanoid(8)}`;
  const chunks = chunkText(content);
  const now = new Date().toISOString();

  // 1. Insert into PostgreSQL if available
  if (db.isAvailable()) {
    try {
      await db.query(
        `INSERT INTO documents (id, tenant_id, provider, resource_id, title, url, author, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, updated_at = NOW()`,
        [docId, tenantId, provider, docId, title, '', author]
      );

      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `chk_${docId}_${i}`;
        const chunkContent = chunks[i];
        const embedding = (vectorRetriever as any).generateMockEmbedding(chunkContent);
        const vectorStr = `[${embedding.slice(0, 1536).join(',')}]`;

        await db.query(
          `INSERT INTO document_chunks (id, document_id, tenant_id, chunk_index, content, embedding, tsv_content)
           VALUES ($1, $2, $3, $4, $5, $6::vector, to_tsvector('english', $5))
           ON CONFLICT (id) DO NOTHING`,
          [chunkId, docId, tenantId, i, chunkContent, vectorStr]
        );
      }

      logger.info({ docId, title, chunkCount: chunks.length }, 'Document ingested into pgvector successfully');
    } catch (err) {
      logger.warn({ err }, 'Failed to persist document to PostgreSQL; continuing with in-memory knowledge store');
    }
  }

  // 2. Keep in-memory cache synchronized so search works instantly in all environments
  const existingIdx = SEED_DOCUMENTS.findIndex(d => d.id === docId);
  const docEntry = {
    id: docId,
    provider,
    resourceId: docId,
    title,
    url: '',
    author,
    chunks,
  };

  if (existingIdx >= 0) {
    SEED_DOCUMENTS[existingIdx] = docEntry;
  } else {
    SEED_DOCUMENTS.push(docEntry);
  }

  return {
    id: docId,
    title,
    provider,
    author,
    chunkCount: chunks.length,
    createdAt: now,
    chunks,
  };
}

export async function getAllDocuments(tenantId: string): Promise<IngestedDocument[]> {
  if (db.isAvailable()) {
    try {
      const res = await db.query(
        `SELECT d.id, d.title, d.provider, d.author, d.created_at, COUNT(c.id) as chunk_count
         FROM documents d
         LEFT JOIN document_chunks c ON c.document_id = d.id
         WHERE d.tenant_id = $1
         GROUP BY d.id, d.title, d.provider, d.author, d.created_at
         ORDER BY d.created_at DESC`,
        [tenantId]
      );

      if (res.rows.length > 0) {
        return res.rows.map(r => ({
          id: r.id,
          title: r.title,
          provider: r.provider,
          author: r.author,
          chunkCount: parseInt(r.chunk_count, 10) || 0,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
          chunks: [],
        }));
      }
    } catch (err) {
      logger.warn({ err }, 'Failed to list documents from PostgreSQL; falling back to memory');
    }
  }

  return SEED_DOCUMENTS.map(d => ({
    id: d.id,
    title: d.title,
    provider: d.provider,
    author: d.author,
    chunkCount: d.chunks.length,
    createdAt: new Date().toISOString(),
    chunks: d.chunks,
  }));
}

export async function deleteDocument(tenantId: string, docId: string): Promise<boolean> {
  if (db.isAvailable()) {
    try {
      await db.query(`DELETE FROM document_chunks WHERE document_id = $1 AND tenant_id = $2`, [docId, tenantId]);
      await db.query(`DELETE FROM documents WHERE id = $1 AND tenant_id = $2`, [docId, tenantId]);
      logger.info({ docId }, 'Document deleted from PostgreSQL');
    } catch (err) {
      logger.warn({ err }, 'Failed to delete document from PostgreSQL');
    }
  }

  const idx = SEED_DOCUMENTS.findIndex(d => d.id === docId);
  if (idx >= 0) {
    SEED_DOCUMENTS.splice(idx, 1);
  }

  return true;
}
