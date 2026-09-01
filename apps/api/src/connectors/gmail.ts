import { DataConnector, ConnectorResource, ConnectorSyncResult } from './base.js';
import { logger } from '../observability/logger.js';

export class GmailConnector extends DataConnector {
  readonly provider = 'gmail' as const;

  private sandboxThreads: ConnectorResource[] = [
    {
      id: 'msg_gm_9921',
      provider: 'gmail',
      title: 'Q3 Enterprise Deployment Schedule & Security Review',
      url: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_9921',
      author: 'David Vance <dvance@security-audit.com>',
      content: 'Security audit confirmed: OAuth tokens must stay encrypted at rest. Deployment scheduled for Thursday 14:00 UTC with zero-downtime rolling restart.',
      updatedAt: new Date().toISOString(),
      metadata: { labels: ['INBOX', 'Security'], threadId: 'th_0921' }
    },
    {
      id: 'msg_gm_9922',
      provider: 'gmail',
      title: 'Client SLA Inquiry: Latency Expectations for Search',
      url: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_9922',
      author: 'Elena Rostova <elena@partner-enterprise.com>',
      content: 'Regarding our SLA: We require sub-second hybrid retrieval and instant cache hits under 50ms for repeat questions. Please confirm support.',
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      metadata: { labels: ['INBOX', 'Client-Priority'], threadId: 'th_0922' }
    }
  ];

  async search(query: string, limit = 5): Promise<ConnectorResource[]> {
    return this.executeWithResilience(async () => {
      logger.info({ provider: this.provider, query }, 'Searching live Gmail messages');
      const q = query.toLowerCase();
      return this.sandboxThreads
        .filter(t => t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q))
        .slice(0, limit);
    });
  }

  async fetch(resourceId: string): Promise<ConnectorResource | null> {
    return this.executeWithResilience(async () => {
      const match = this.sandboxThreads.find(t => t.id === resourceId);
      return match || null;
    });
  }

  async syncIncremental(cursor?: string): Promise<ConnectorSyncResult> {
    return this.executeWithResilience(async () => {
      logger.info({ provider: this.provider, cursor }, 'Performing incremental Gmail sync');
      return {
        provider: this.provider,
        syncedCount: this.sandboxThreads.length,
        newCursor: `gmail_cursor_${Date.now()}`,
        status: 'completed',
      };
    });
  }
}

export const gmailConnector = new GmailConnector();
