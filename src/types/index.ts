export type ExecutionMode = 'AUTO' | 'DIRECT' | 'CAG' | 'RAG' | 'MAG' | 'LIVE_TOOL' | 'MULTI_HOP';

export interface Citation {
  citationIndex: number;
  sourceId: string;
  provider: string;
  title: string;
  url: string;
  author: string;
  excerpt: string;
  score: number;
}

export interface PlanStep {
  stepIndex: number;
  description: string;
  action: string;
  targetProvider?: string;
  subQuery: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[];
  executionMode?: ExecutionMode;
  latencyMs?: number;
  cacheHit?: boolean;
  tokensIn?: number;
  tokensOut?: number;
  plan?: { steps: PlanStep[] };
  timestamp: string;
}

export interface IntegrationStatus {
  provider: 'gmail' | 'notion' | 'jira';
  name: string;
  status: 'connected' | 'syncing' | 'error' | 'disconnected';
  lastSyncedAt: string;
  syncedItems: number;
  syncHealth: string;
}

export interface MemoryItem {
  id: string;
  tenantId: string;
  memoryType: 'preference' | 'project_context' | 'fact' | 'summary';
  content: string;
  importance: number;
  confidence: number;
  source: string;
  createdAt: string;
}

export interface SystemMetrics {
  requestsTotal: number;
  cache: {
    hits: number;
    misses: number;
    hitRatePercent: number;
  };
  latency: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
  };
  tokens: {
    total: number;
  };
  cost: {
    totalUsd: number;
  };
}
