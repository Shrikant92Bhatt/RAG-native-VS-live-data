import { FastifyInstance } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { SEED_DOCUMENTS } from '../../db/seed.js';

export async function sourceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authMiddleware);

  fastify.get<{ Params: { id: string } }>('/api/v1/sources/:id', async (request, reply) => {
    const { id } = request.params;
    const doc = SEED_DOCUMENTS.find(d => d.id === id || id.startsWith(`chunk_${d.id}`));

    if (!doc) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: `Source with id ${id} not found.` });
    }

    return reply.send({
      id: doc.id,
      provider: doc.provider,
      resourceId: doc.resourceId,
      title: doc.title,
      url: doc.url,
      author: doc.author,
      chunks: doc.chunks,
      updatedAt: new Date().toISOString(),
    });
  });
}
