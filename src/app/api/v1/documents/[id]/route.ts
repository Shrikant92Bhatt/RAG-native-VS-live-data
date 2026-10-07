import { NextRequest, NextResponse } from 'next/server';
import { deleteDocument } from '@/retrieval/ingest';
import { config } from '@/config/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
  const { id } = await params;

  await deleteDocument(tenantId, id);
  return NextResponse.json({ success: true, deletedId: id });
}
