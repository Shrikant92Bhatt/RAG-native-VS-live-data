import { logger } from '../observability/logger.js';

export interface ConnectorResource {
  id: string;
  provider: 'gmail' | 'notion' | 'jira';
  title: string;
  url: string;
  author: string;
  content: string;
  updatedAt: string;
  metadata?: Record<string, any>;
}

export interface ConnectorSyncResult {
  provider: string;
  syncedCount: number;
  newCursor?: string;
  status: 'completed' | 'partial' | 'failed';
  error?: string;
}

export abstract class DataConnector {
  abstract readonly provider: 'gmail' | 'notion' | 'jira';
  protected failureCount = 0;
  protected circuitState: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  protected lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly cooldownPeriodMs = 30000;

  abstract search(query: string, limit?: number): Promise<ConnectorResource[]>;
  abstract fetch(resourceId: string): Promise<ConnectorResource | null>;
  abstract syncIncremental(cursor?: string): Promise<ConnectorSyncResult>;

  async healthCheck(): Promise<boolean> {
    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.cooldownPeriodMs) {
        this.circuitState = 'HALF_OPEN';
        logger.info({ provider: this.provider }, 'Circuit breaker transitioning to HALF_OPEN');
      } else {
        return false;
      }
    }
    return true;
  }

  protected async executeWithResilience<T>(operation: () => Promise<T>, timeoutMs = 8000): Promise<T> {
    if (!(await this.healthCheck())) {
      throw new Error(`Circuit breaker is OPEN for connector: ${this.provider}`);
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout of ${timeoutMs}ms exceeded for ${this.provider}`)), timeoutMs)
    );

    try {
      const result = await Promise.race([operation(), timeoutPromise]);
      if (this.circuitState === 'HALF_OPEN') {
        this.circuitState = 'CLOSED';
        this.failureCount = 0;
        logger.info({ provider: this.provider }, 'Circuit breaker reset to CLOSED');
      }
      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.failureThreshold) {
        this.circuitState = 'OPEN';
        logger.error({ provider: this.provider, err }, 'Circuit breaker tripped to OPEN');
      }
      throw err;
    }
  }
}
