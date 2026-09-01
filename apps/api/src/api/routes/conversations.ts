import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { shortTermMemory } from '../../memory/short_term.js';

export async function conversationRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/v1/conversations', async (request, reply) => {
    // Return list of active conversations
    return reply.send({
      conversations: [
        {
          id: 'conv_sample_eng',
          title: 'Sprint 44 Architecture & Hybrid Search Verification',
          mode: 'AUTO',
          createdAt: new Date().toISOString(),
          lastMessage: 'Verified acceptance criteria for PROJ-1042.',
        },
      ],
    });
  });

  fastify.get<{ Params: { id: string } }>('/api/v1/conversations/:id', async (request, reply) => {
    const { id } = request.params;
    const history = await shortTermMemory.getRecentMessages(id, 25);
    return reply.send({
      conversation_id: id,
      messages: history,
    });
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/conversations/:id', async (request, reply) => {
    const { id } = request.params;
    await shortTermMemory.clearSession(id);
    return reply.send({ success: true, conversation_id: id });
  });
}
