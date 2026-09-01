import { RetrievedChunk } from './vector';
import { logger } from '../observability/logger';

export class Reranker {
  /**
   * Evaluates semantic alignment, title boost, and query coverage.
   */
  rerank(query: string, candidates: RetrievedChunk[], topK = 3, threshold = 0.005): RetrievedChunk[] {
    const startTime = Date.now();
    const queryTerms = query.toLowerCase().split(/\W+/).filter(t => t.length > 2);

    const scored = candidates.map(chunk => {
      let alignmentScore = chunk.score;
      const lowerContent = chunk.content.toLowerCase();
      const lowerTitle = chunk.title.toLowerCase();

      let matchedTerms = 0;
      for (const term of queryTerms) {
        if (lowerTitle.includes(term)) {
          alignmentScore += 0.05;
          matchedTerms++;
        } else if (lowerContent.includes(term)) {
          alignmentScore += 0.02;
          matchedTerms++;
        }
      }

      // Coverage ratio
      const coverageRatio = queryTerms.length > 0 ? matchedTerms / queryTerms.length : 1;
      const finalScore = Number((alignmentScore * (0.6 + 0.4 * coverageRatio)).toFixed(6));

      return {
        ...chunk,
        score: finalScore,
        retrievalMode: 'reranked',
      };
    });

    const filtered = scored
      .filter(c => c.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    logger.debug(
      { before: candidates.length, after: filtered.length, latencyMs: Date.now() - startTime },
      'Reranker completed filtering and scoring'
    );

    return filtered;
  }
}

export const reranker = new Reranker();
