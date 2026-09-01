import { Redis } from 'ioredis';
import { config } from '../config/index';
import { logger } from '../observability/logger';

export class RedisService {
  private client: Redis | null = null;
  private memoryFallback: Map<string, { value: string; expiresAt: number }> = new Map();
  private isConnected = false;

  constructor() {
    try {
      this.client = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy(times: number) {
          if (times > 3) return null;
          return Math.min(times * 100, 1000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        logger.info('Connected to Redis cache layer.');
      });

      this.client.on('error', (err: Error) => {
        logger.warn({ message: err.message }, 'Redis unavailable; operating in memory-cache fallback mode');
        this.isConnected = false;
      });
    } catch (err) {
      logger.warn({ message: (err as Error).message }, 'Redis init failed; using memory fallback');
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch (err) {
        logger.debug({ key }, 'Redis get error, falling back to memory cache');
      }
    }

    const item = this.memoryFallback.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, ttlSeconds = config.CACHE_TTL_SECONDS): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch (err) {
        logger.debug({ key }, 'Redis set error, caching in memory fallback');
      }
    }

    this.memoryFallback.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        await this.client.del(key);
      } catch (err) {
        // ignore
      }
    }
    this.memoryFallback.delete(key);
  }

  isAvailable(): boolean {
    return this.isConnected;
  }
}

export const redis = new RedisService();
