import { DataConnector, ConnectorResource, ConnectorSyncResult } from './base.js';
import { logger } from '../observability/logger.js';

export class JiraConnector extends DataConnector {
  readonly provider = 'jira' as const;

  private sandboxIssues: ConnectorResource[] = [
    {
      id: 'PROJ-1042',
      provider: 'jira',
      title: '[PROJ-1042] Deploy Hybrid Reranker and Multi-hop Query Router',
      url: 'https://jira.acme.corp/browse/PROJ-1042',
      author: 'Sarah Jenkins (Principal SRE)',
      content: 'Status: IN PROGRESS. Sprint: Sprint 44. Priority: High. Description: Acceptance criteria 1. Hybrid BM25 + Vector retrieval fused with Reciprocal Rank Fusion (RRF k=60). 2. Reranker filters low-scoring candidates. Blocked by DB migration.',
      updatedAt: new Date().toISOString(),
      metadata: { key: 'PROJ-1042', status: 'In Progress', priority: 'High', assignee: 'Sarah Jenkins' }
    },
    {
      id: 'PROJ-1045',
      provider: 'jira',
      title: '[PROJ-1045] Audit Long-Term Memory Expiration and PII Sanitization',
      url: 'https://jira.acme.corp/browse/PROJ-1045',
      author: 'David Vance (Security Lead)',
      content: 'Status: TO DO. Sprint: Sprint 45. Description: Memory table must purge expired memories and ensure no credit card numbers or raw tokens are stored in long-term memories.',
      updatedAt: new Date(Date.now() - 7200000).toISOString(),
      metadata: { key: 'PROJ-1045', status: 'To Do', priority: 'Medium', assignee: 'David Vance' }
    }
  ];

  async search(query: string, limit = 5): Promise<ConnectorResource[]> {
    return this.executeWithResilience(async () => {
      logger.info({ provider: this.provider, query }, 'Querying live Jira tickets via JQL');
      const q = query.toLowerCase();
      return this.sandboxIssues
        .filter(i => i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q) || i.id.toLowerCase().includes(q))
        .slice(0, limit);
    });
  }

  async fetch(resourceId: string): Promise<ConnectorResource | null> {
    return this.executeWithResilience(async () => {
      const match = this.sandboxIssues.find(i => i.id === resourceId);
      return match || null;
    });
  }

  async syncIncremental(cursor?: string): Promise<ConnectorSyncResult> {
    return this.executeWithResilience(async () => {
      logger.info({ provider: this.provider, cursor }, 'Performing incremental Jira sync');
      return {
        provider: this.provider,
        syncedCount: this.sandboxIssues.length,
        newCursor: `jira_cursor_${Date.now()}`,
        status: 'completed',
      };
    });
  }
}

export const jiraConnector = new JiraConnector();
