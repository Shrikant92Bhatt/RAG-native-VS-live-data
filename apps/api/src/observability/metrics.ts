export interface BenchmarkMetric {
  query: string;
  route: string;
  retrievalStrategy: string;
  topK: number;
  retrievalLatencyMs: number;
  rerankLatencyMs: number;
  generationLatencyMs: number;
  totalLatencyMs: number;
  tokensIn: number;
  tokensOut: number;
  costUsd: number;
  retrievalRecall: number;
  citationAccuracy: number;
  answerQuality: number;
  cacheHit: boolean;
  timestamp: string;
}

class MetricsCollector {
  private requestsTotal = 0;
  private cacheHitsTotal = 0;
  private cacheMissesTotal = 0;
  private latencies: number[] = [];
  private totalTokens = 0;
  private totalCostUsd = 0;
  private benchmarkRecords: BenchmarkMetric[] = [];

  recordRequest(latencyMs: number, cacheHit: boolean, tokensIn = 0, tokensOut = 0, costUsd = 0) {
    this.requestsTotal++;
    if (cacheHit) {
      this.cacheHitsTotal++;
    } else {
      this.cacheMissesTotal++;
    }
    this.latencies.push(latencyMs);
    if (this.latencies.length > 2000) {
      this.latencies.shift();
    }
    this.totalTokens += tokensIn + tokensOut;
    this.totalCostUsd += costUsd;
  }

  recordBenchmark(metric: BenchmarkMetric) {
    this.benchmarkRecords.push(metric);
    this.recordRequest(
      metric.totalLatencyMs,
      metric.cacheHit,
      metric.tokensIn,
      metric.tokensOut,
      metric.costUsd
    );
  }

  private calculatePercentile(p: number): number {
    if (this.latencies.length === 0) return 0;
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const index = Math.min(Math.floor((p / 100) * sorted.length), sorted.length - 1);
    return sorted[index];
  }

  getSnapshot() {
    const totalCacheAttempts = this.cacheHitsTotal + this.cacheMissesTotal;
    const hitRate = totalCacheAttempts > 0 ? (this.cacheHitsTotal / totalCacheAttempts) * 100 : 0;

    return {
      requestsTotal: this.requestsTotal,
      cache: {
        hits: this.cacheHitsTotal,
        misses: this.cacheMissesTotal,
        hitRatePercent: Number(hitRate.toFixed(2)),
      },
      latency: {
        p50Ms: this.calculatePercentile(50),
        p95Ms: this.calculatePercentile(95),
        p99Ms: this.calculatePercentile(99),
      },
      tokens: {
        total: this.totalTokens,
      },
      cost: {
        totalUsd: Number(this.totalCostUsd.toFixed(5)),
      },
      recentBenchmarks: this.benchmarkRecords.slice(-10),
    };
  }
}

export const metrics = new MetricsCollector();
