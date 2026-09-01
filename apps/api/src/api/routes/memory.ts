import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { longTermMemory } from '../../memory/long_term.js';

const memoryCreateSchema = z.object({
  memoryType: z.enum(['preference', 'project_context', 'fact', 'summary']),
  content: z.string().min(3).max(2000),
  importance: z.number().min(0).max(1).default(0.8),
  confidence: z.number().min(0).max(1).default(0.95),
});

export async function memoryRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get('/api/v1/memory', async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const memories = await longTermMemory.getAllMemories(tenantId);
    return reply.send({ memories });
  });

  fastify.post('/api/v1/memory', async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const userId = request.user!.userId;
    const body = memoryCreateSchema.parse(request.body);

    const saved = await longTermMemory.storeMemory(
      tenantId,
      userId,
      body.memoryType,
      body.content,
      body.importance,
      body.confidence
    );

    return reply.status(201).send({ memory: saved });
  });

  fastify.delete<{ Params: { id: string } }>('/api/v1/memory/:id', async (request, reply) => {
    const tenantId = request.user!.tenantId;
    const { id } = request.params;
    await longTermMemory.deleteMemory(tenantId, id);
    return reply.send({ success: true, deletedId: id });
  });
}
