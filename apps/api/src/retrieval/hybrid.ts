import { vectorRetriever, RetrievedChunk } from './vector.js';
import { bm25Retriever } from './bm25.js';
import { logger } from '../observability/logger.js';

export class HybridRetriever {
  /**
   * Reciprocal Rank Fusion (RRF)
   * Score(d) = sum( 1 / (k + rank_i(d)) )
   */
  async search(tenantId: string, query: string, topK = 5, rrfK = 60): Promise<RetrievedChunk[]> {
    const startTime = Date.now();

    // Parallel retrieval from both vector and keyword engines
    const [vectorResults, bm25Results] = await Promise.all([
      vectorRetriever.search(tenantId, query, topK * 2),
      bm25Retriever.search(tenantId, query, topK * 2),
    ]);

    const rrfScores = new Map<string, { chunk: RetrievedChunk; score: number }>();

    // Process vector rankings
    vectorResults.forEach((chunk, index) => {
      const rank = index + 1;
      const weight = 1 / (rrfK + rank);
      rrfScores.set(chunk.chunkId, {
        chunk: { ...chunk, retrievalMode: 'hybrid-vector' },
        score: weight,
      });
    });

    // Process BM25 rankings and fuse
    bm25Results.forEach((chunk, index) => {
      const rank = index + 1;
      const weight = 1 / (rrfK + rank);
      if (rrfScores.has(chunk.chunkId)) {
        const existing = rrfScores.get(chunk.chunkId)!;
        existing.score += weight;
        existing.chunk.retrievalMode = 'hybrid-fused';
      } else {
        rrfScores.set(chunk.chunkId, {
          chunk: { ...chunk, retrievalMode: 'hybrid-bm25' },
          score: weight,
        });
      }
    });

    const fused = Array.from(rrfScores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(entry => ({
        ...entry.chunk,
        score: Number(entry.score.toFixed(6)),
      }));

    logger.debug(
      { query, fusedCount: fused.length, latencyMs: Date.now() - startTime },
      'Hybrid RRF fusion complete'
    );

    return fused;
  }
}

export const hybridRetriever = new HybridRetriever();
