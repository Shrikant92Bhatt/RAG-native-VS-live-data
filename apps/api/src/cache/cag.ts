import { redis } from './redis.js';
import { logger } from '../observability/logger.js';
import { createHash } from 'crypto';

export class CagService {
  private hashKey(input: string): string {
    return createHash('sha256').update(input.trim().toLowerCase()).digest('hex');
  }

  // Exact Query / Answer Cache (Tier 1)
  async getExactResponse(tenantId: string, query: string): Promise<any | null> {
    const hash = this.hashKey(query);
    const key = `cag:response:${tenantId}:${hash}`;
    const cached = await redis.get(key);
    if (cached) {
      logger.debug({ query, key }, 'CAG Exact Cache HIT');
      return JSON.parse(cached);
    }
    return null;
  }

  async setExactResponse(tenantId: string, query: string, data: any, ttl = 1800): Promise<void> {
    const hash = this.hashKey(query);
    const key = `cag:response:${tenantId}:${hash}`;
    await redis.set(key, JSON.stringify(data), ttl);
  }

  // Retrieval Candidates Cache (Tier 2)
  async getRetrievalCache(tenantId: string, query: string, strategy: string): Promise<any[] | null> {
    const hash = this.hashKey(`${strategy}:${query}`);
    const key = `cag:retrieval:${tenantId}:${hash}`;
    const cached = await redis.get(key);
    if (cached) {
      logger.debug({ strategy, query }, 'CAG Retrieval Cache HIT');
      return JSON.parse(cached);
    }
    return null;
  }

  async setRetrievalCache(tenantId: string, query: string, strategy: string, candidates: any[], ttl = 600): Promise<void> {
    const hash = this.hashKey(`${strategy}:${query}`);
    const key = `cag:retrieval:${tenantId}:${hash}`;
    await redis.set(key, JSON.stringify(candidates), ttl);
  }

  // Tool / MCP API Cache (Tier 3)
  async getToolCache(tenantId: string, tool: string, args: Record<string, any>): Promise<any | null> {
    const argHash = this.hashKey(JSON.stringify(args));
    const key = `cag:tool:${tenantId}:${tool}:${argHash}`;
    const cached = await redis.get(key);
    if (cached) {
      logger.debug({ tool, key }, 'CAG Tool Cache HIT');
      return JSON.parse(cached);
    }
    return null;
  }

  async setToolCache(tenantId: string, tool: string, args: Record<string, any>, result: any, ttl = 300): Promise<void> {
    const argHash = this.hashKey(JSON.stringify(args));
    const key = `cag:tool:${tenantId}:${tool}:${argHash}`;
    await redis.set(key, JSON.stringify(result), ttl);
  }
}

export const cag = new CagService();
