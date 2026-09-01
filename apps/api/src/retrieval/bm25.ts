import { db } from '../db/client.js';
import { logger } from '../observability/logger.js';
import { SEED_DOCUMENTS } from '../db/seed.js';
import { RetrievedChunk } from './vector.js';

export class BM25Retriever {
  /**
   * Calculates classic BM25 keyword relevance score in-memory.
   */
  private scoreBM25(queryTokens: string[], docText: string): number {
    const docTokens = docText.toLowerCase().split(/\W+/).filter(Boolean);
    const docLen = docTokens.length;
    const avgDocLen = 30;
    const k1 = 1.5;
    const b = 0.75;

    let score = 0;
    for (const term of queryTokens) {
      const termFreq = docTokens.filter(t => t === term).length;
      if (termFreq > 0) {
        const idf = 1.8; // Normalized IDF
        const tf = (termFreq * (k1 + 1)) / (termFreq + k1 * (1 - b + b * (docLen / avgDocLen)));
        score += idf * tf;
      }
    }
    return score;
  }

  async search(tenantId: string, query: string, topK = 5): Promise<RetrievedChunk[]> {
    const startTime = Date.now();

    if (db.isAvailable()) {
      try {
        const res = await db.query(
          `SELECT c.id as chunk_id, c.document_id, c.content, d.title, d.provider, d.url, d.author,
                  ts_rank_cd(c.tsv_content, plainto_tsquery('english', $1)) as rank
           FROM document_chunks c
           JOIN documents d ON d.id = c.document_id
           WHERE c.tenant_id = $2 AND c.tsv_content @@ plainto_tsquery('english', $1)
           ORDER BY rank DESC
           LIMIT $3`,
          [query, tenantId, topK]
        );

        if (res.rows.length > 0) {
          logger.debug({ count: res.rows.length, latencyMs: Date.now() - startTime }, 'BM25 tsquery search complete');
          return res.rows.map(r => ({
            chunkId: r.chunk_id,
            documentId: r.document_id,
            title: r.title,
            provider: r.provider,
            url: r.url,
            author: r.author,
            content: r.content,
            score: Number(r.rank) || 0.5,
            retrievalMode: 'bm25',
          }));
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, 'Database BM25 fallback to memory index');
      }
    }

    // In-memory BM25 fallback
    const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);
    const results: RetrievedChunk[] = [];

    for (const doc of SEED_DOCUMENTS) {
      for (let i = 0; i < doc.chunks.length; i++) {
        const content = doc.chunks[i];
        const bmScore = this.scoreBM25(queryTerms, `${doc.title} ${content}`);
        if (bmScore > 0) {
          results.push({
            chunkId: `chunk_${doc.id}_${i}`,
            documentId: doc.id,
            title: doc.title,
            provider: doc.provider,
            url: doc.url,
            author: doc.author,
            content,
            score: Number(bmScore.toFixed(4)),
            retrievalMode: 'bm25',
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}

export const bm25Retriever = new BM25Retriever();
