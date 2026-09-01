import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { config } from './config/index.js';
import { logger } from './observability/logger.js';
import { errorHandler } from './api/middleware/errorHandler.js';
import { chatRoutes } from './api/routes/chat.js';
import { conversationRoutes } from './api/routes/conversations.js';
import { memoryRoutes } from './api/routes/memory.js';
import { integrationRoutes } from './api/routes/integrations.js';
import { sourceRoutes } from './api/routes/sources.js';
import { healthRoutes } from './api/routes/health.js';
import { runMigrations } from './db/migrate.js';
import { seedDatabase } from './db/seed.js';
import { db } from './db/client.js';

export async function buildApp() {
  const app = Fastify({
    logger: false, // Using our structured pino logger
    trustProxy: true,
  });

  // Register plugins
  await app.register(sensible);
  await app.register(cors, {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW_MS,
  });

  // Global Error Handler
  app.setErrorHandler(errorHandler);

  // Register API Routes
  await app.register(healthRoutes);
  await app.register(chatRoutes);
  await app.register(conversationRoutes);
  await app.register(memoryRoutes);
  await app.register(integrationRoutes);
  await app.register(sourceRoutes);

  return app;
}

async function startServer() {
  const app = await buildApp();

  // Attempt database migrations and seeding
  try {
    const migrated = await runMigrations();
    if (migrated) {
      await seedDatabase();
    }
  } catch (err) {
    logger.warn({ err: (err as Error).message }, 'Startup migration check encountered issue; continuing with fallback');
  }

  // Graceful shutdown handling
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      logger.info({ signal }, 'Graceful shutdown initiated...');
      await app.close();
      await db.close();
      process.exit(0);
    });
  }

  try {
    await app.listen({ port: config.APP_PORT, host: '0.0.0.0' });
    logger.info(`Production Agentic RAG API listening at http://0.0.0.0:${config.APP_PORT}`);
  } catch (err) {
    logger.error({ err }, 'Failed to bind and start Fastify API server');
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('main.ts') || process.argv[1]?.endsWith('main.js')) {
  startServer();
}
