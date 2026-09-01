import { NextRequest, NextResponse } from 'next/server';
import { shortTermMemory } from '@/memory/short_term';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const history = await shortTermMemory.getRecentMessages(id, 25);
  return NextResponse.json({
    conversation_id: id,
    messages: history,
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await shortTermMemory.clearSession(id);
  return NextResponse.json({ success: true, conversation_id: id });
}
