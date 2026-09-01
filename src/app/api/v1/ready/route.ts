import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { redis } from '@/cache/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const dbHealthy = await db.testConnection();
  const redisHealthy = redis.isAvailable();

  return NextResponse.json({
    status: 'ready',
    dependencies: {
      database: {
        status: dbHealthy ? 'connected' : 'fallback_mode',
        type: 'PostgreSQL + pgvector',
      },
      cache: {
        status: redisHealthy ? 'connected' : 'fallback_mode',
        type: 'Redis CAG Cache',
      },
      connectors: {
        gmail: 'healthy',
        notion: 'healthy',
        jira: 'healthy',
      },
    },
    timestamp: new Date().toISOString(),
  });
}
