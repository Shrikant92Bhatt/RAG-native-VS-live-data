import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { agentOrchestrator } from '@/agents/orchestrator';
import { config } from '@/config/index';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const chatRequestSchema = z.object({
  query: z.string().min(1).max(4000),
  conversationId: z.string().optional(),
  mode: z.enum(['AUTO', 'DIRECT', 'CAG', 'RAG', 'MAG', 'LIVE_TOOL', 'MULTI_HOP']).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = chatRequestSchema.parse(body);

    const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
    const userId = req.headers.get('x-user-id') || config.DEFAULT_USER_ID;
    const conversationId = parsed.conversationId || `conv_${nanoid(12)}`;

    const result = await agentOrchestrator.execute(
      tenantId,
      userId,
      conversationId,
      parsed.query,
      parsed.mode
    );

    return NextResponse.json({
      conversation_id: conversationId,
      ...result,
    });
  } catch (err: any) {
    const isZod = err.name === 'ZodError';
    return NextResponse.json(
      {
        error_code: isZod ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
        message: err.message || 'Error processing chat query',
      },
      { status: isZod ? 400 : 500 }
    );
  }
}
