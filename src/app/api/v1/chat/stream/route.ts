import { NextRequest } from 'next/server';
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

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
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
        } catch (err: any) {
          sendEvent('error', { message: err.message || 'Stream processing failed' });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error_code: 'VALIDATION_ERROR', message: err.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
