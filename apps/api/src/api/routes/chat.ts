import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { agentOrchestrator } from '../../agents/orchestrator.js';
import { authMiddleware } from '../middleware/auth.js';
import { nanoid } from 'nanoid';

const chatRequestSchema = z.object({
  query: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
  mode: z.enum(['AUTO', 'DIRECT', 'CAG', 'RAG', 'MAG', 'LIVE_TOOL', 'MULTI_HOP']).optional(),
});

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  // Synchronous Chat Endpoint
  fastify.post('/api/v1/chat', async (request, reply) => {
    const parsed = chatRequestSchema.parse(request.body);
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const conversationId = parsed.conversationId || `conv_${nanoid(12)}`;

    const result = await agentOrchestrator.execute(
      tenantId,
      userId,
      conversationId,
      parsed.query,
      parsed.mode
    );

    return reply.send({
      conversation_id: conversationId,
      ...result,
    });
  });

  // Streaming Chat Endpoint via Server-Sent Events (SSE)
  fastify.post('/api/v1/chat/stream', async (request, reply) => {
    const parsed = chatRequestSchema.parse(request.body);
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const conversationId = parsed.conversationId || `conv_${nanoid(12)}`;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: any) => {
      reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    sendEvent('session', { conversation_id: conversationId });

    try {
      await agentOrchestrator.execute(
        tenantId,
        userId,
        conversationId,
        parsed.query,
        parsed.mode,
        (evt) => {
          sendEvent(evt.event, evt.data);
        }
      );
    } catch (err) {
      sendEvent('error', { message: (err as Error).message });
    } finally {
      reply.raw.end();
    }
  });
}
