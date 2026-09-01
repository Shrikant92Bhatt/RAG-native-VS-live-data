import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { longTermMemory } from '@/memory/long_term';
import { config } from '@/config/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const memoryCreateSchema = z.object({
  memoryType: z.enum(['preference', 'project_context', 'fact', 'summary']),
  content: z.string().min(3).max(2000),
  importance: z.number().min(0).max(1).default(0.8),
  confidence: z.number().min(0).max(1).default(0.95),
});

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
  const memories = await longTermMemory.getAllMemories(tenantId);
  return NextResponse.json({ memories });
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
    const userId = req.headers.get('x-user-id') || config.DEFAULT_USER_ID;
    const body = await req.json();
    const parsed = memoryCreateSchema.parse(body);

    const saved = await longTermMemory.storeMemory(
      tenantId,
      userId,
      parsed.memoryType,
      parsed.content,
      parsed.importance,
      parsed.confidence
    );

    return NextResponse.json({ memory: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error_code: 'VALIDATION_ERROR', message: err.message },
      { status: 400 }
    );
  }
}
