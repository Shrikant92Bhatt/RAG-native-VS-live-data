import { NextRequest, NextResponse } from 'next/server';
import { longTermMemory } from '@/memory/long_term';
import { config } from '@/config/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
  const { id } = await params;
  await longTermMemory.deleteMemory(tenantId, id);
  return NextResponse.json({ success: true, deletedId: id });
}
