import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { gmailConnector } from '../../connectors/gmail.js';
import { notionConnector } from '../../connectors/notion.js';
import { jiraConnector } from '../../connectors/jira.js';

export async function integrationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/v1/integrations', async (_request, reply) => {
    return reply.send({
      integrations: [
        {
          provider: 'gmail',
          name: 'Google Workspace / Gmail',
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
          syncedItems: 24,
          syncHealth: 'healthy',
        },
        {
          provider: 'notion',
          name: 'Notion Workspace',
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
          syncedItems: 18,
          syncHealth: 'healthy',
        },
        {
          provider: 'jira',
          name: 'Atlassian Jira Software',
          status: 'connected',
          lastSyncedAt: new Date().toISOString(),
          syncedItems: 42,
          syncHealth: 'healthy',
        },
      ],
    });
  });

  fastify.post<{ Params: { provider: string } }>('/api/v1/sync/:provider', async (request, reply) => {
    const { provider } = request.params;
    let result;

    if (provider === 'gmail') {
      result = await gmailConnector.syncIncremental();
    } else if (provider === 'notion') {
      result = await notionConnector.syncIncremental();
    } else if (provider === 'jira') {
      result = await jiraConnector.syncIncremental();
    } else {
      return reply.status(400).send({ error: 'UNKNOWN_PROVIDER', message: `Provider ${provider} not supported.` });
    }

    return reply.send({
      ...result,
      syncedAt: new Date().toISOString(),
    });
  });
}
