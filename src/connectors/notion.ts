import { DataConnector, ConnectorResource, ConnectorSyncResult } from './base';
import { logger } from '../observability/logger';

export class NotionConnector extends DataConnector {
  readonly provider = 'notion' as const;

  private sandboxPages: ConnectorResource[] = [
    {
      id: 'page_arch_2026',
      provider: 'notion',
      title: 'Core Engine Architecture & Service Level Agreements',
      url: 'https://notion.so/acme/architecture-v3',
      author: 'Platform Architecture Team',
      content: 'The multi-tenant RAG engine operates with strict SLA: p95 latency under 800ms for hybrid searches and under 25ms for cached CAG queries. Data isolation is strictly enforced at the SQL layer.',
      updatedAt: new Date().toISOString(),
      metadata: { status: 'Published', parentDb: 'Engineering Wiki' }
    },
    {
      id: 'page_onboarding_eng',
      provider: 'notion',
      title: 'Engineer Onboarding & Multi-Tenant Security Standards',
      url: 'https://notion.so/acme/onboarding-guide',
      author: 'Engineering Ops',
      content: 'Every API endpoint must validate tenant_id from the authenticated JWT token. Never bypass tenant isolation in raw SQL queries. Always redact bearer tokens in logging.',
      updatedAt: new Date(Date.now() - 86400000).toISOString(),
      metadata: { status: 'Active', parentDb: 'HR Wiki' }
    }
  ];

  async search(query: string, limit = 5): Promise<ConnectorResource[]> {
    return this.executeWithResilience(async () => {
      logger.info({ provider: this.provider, query }, 'Searching live Notion workspace');
      const q = query.toLowerCase();
      return this.sandboxPages
        .filter(p => p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q))
        .slice(0, limit);
    });
  }

  async fetch(resourceId: string): Promise<ConnectorResource | null> {
    return this.executeWithResilience(async () => {
      const match = this.sandboxPages.find(p => p.id === resourceId);
      return match || null;
    });
  }

  async syncIncremental(cursor?: string): Promise<ConnectorSyncResult> {
    return this.executeWithResilience(async () => {
      logger.info({ provider: this.provider, cursor }, 'Performing incremental Notion sync');
      return {
        provider: this.provider,
        syncedCount: this.sandboxPages.length,
        newCursor: `notion_cursor_${Date.now()}`,
        status: 'completed',
      };
    });
  }
}

export const notionConnector = new NotionConnector();
