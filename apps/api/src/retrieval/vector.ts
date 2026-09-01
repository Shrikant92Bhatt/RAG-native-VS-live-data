import { db } from '../db/client.js';
import { logger } from '../observability/logger.js';
import { SEED_DOCUMENTS } from '../db/seed.js';

export interface RetrievedChunk {
  chunkId: string;
  documentId: string;
  title: string;
  provider: string;
  url: string;
  author: string;
  content: string;
  score: number;
  retrievalMode?: string;
}

export class VectorRetriever {
  /**
   * Generates a deterministic simulated embedding vector for a given text.
   */
  private generateMockEmbedding(text: string, dim = 1536): number[] {
    const vector = new Array(dim).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const hash = words[i].split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      vector[hash % dim] += 1;
    }
    // L2 Normalize
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    return vector.map(v => v / norm);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dot = 0;
    for (let i = 0; i < Math.min(vecA.length, vecB.length); i++) {
      dot += vecA[i] * vecB[i];
    }
    return dot;
  }

  async search(tenantId: string, query: string, topK = 5): Promise<RetrievedChunk[]> {
    const startTime = Date.now();

    if (db.isAvailable()) {
      try {
        const queryEmbedding = this.generateMockEmbedding(query);
        const vectorStr = `[${queryEmbedding.slice(0, 1536).join(',')}]`;
        const res = await db.query(
          `SELECT c.id as chunk_id, c.document_id, c.content, d.title, d.provider, d.url, d.author,
                  1 - (c.embedding <=> $1::vector) as similarity
           FROM document_chunks c
           JOIN documents d ON d.id = c.document_id
           WHERE c.tenant_id = $2
           ORDER BY similarity DESC
           LIMIT $3`,
          [vectorStr, tenantId, topK]
        );

        if (res.rows.length > 0) {
          logger.debug({ count: res.rows.length, latencyMs: Date.now() - startTime }, 'Vector search pgvector complete');
          return res.rows.map(r => ({
            chunkId: r.chunk_id,
            documentId: r.document_id,
            title: r.title,
            provider: r.provider,
            url: r.url,
            author: r.author,
            content: r.content,
            score: Number(r.similarity) || 0.8,
            retrievalMode: 'vector',
          }));
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, 'pgvector query fallback to in-memory vector index');
      }
    }

    // In-memory fallback
    const queryVec = this.generateMockEmbedding(query);
    const allChunks: RetrievedChunk[] = [];

    for (const doc of SEED_DOCUMENTS) {
      for (let i = 0; i < doc.chunks.length; i++) {
        const chunkContent = doc.chunks[i];
        const chunkVec = this.generateMockEmbedding(chunkContent);
        const score = this.cosineSimilarity(queryVec, chunkVec);
        allChunks.push({
          chunkId: `chunk_${doc.id}_${i}`,
          documentId: doc.id,
          title: doc.title,
          provider: doc.provider,
          url: doc.url,
          author: doc.author,
          content: chunkContent,
          score: Math.max(0.1, Number(score.toFixed(4))),
          retrievalMode: 'vector',
        });
      }
    }

    return allChunks.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

export const vectorRetriever = new VectorRetriever();
