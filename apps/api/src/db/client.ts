import pg from 'pg';
import { config } from '../config/index.js';
import { logger } from '../observability/logger.js';

const { Pool } = pg;

export class DatabaseClient {
  private pool: pg.Pool | null = null;
  private isConnected = false;

  constructor() {
    try {
      this.pool = new Pool({
        connectionString: config.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 3000,
      });

      this.pool.on('error', (err) => {
        logger.error({ err }, 'Unexpected error on idle PostgreSQL client');
      });
    } catch (err) {
      logger.warn({ err }, 'PostgreSQL pool initialization warning; fallback enabled');
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.pool) return false;
    try {
      const client = await this.pool.connect();
      try {
        await client.query('SELECT 1');
        this.isConnected = true;
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      logger.warn({ message: (err as Error).message }, 'PostgreSQL not reachable; running with fallback storage');
      this.isConnected = false;
      return false;
    }
  }

  async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }
    return this.pool.query<T>(text, params);
  }

  getPool(): pg.Pool | null {
    return this.pool;
  }

  isAvailable(): boolean {
    return this.isConnected;
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

export const db = new DatabaseClient();
