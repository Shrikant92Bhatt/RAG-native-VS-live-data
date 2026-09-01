import { NextRequest, NextResponse } from 'next/server';
import { SEED_DOCUMENTS } from '@/db/seed';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const doc = SEED_DOCUMENTS.find(d => d.id === id || id.startsWith(`chunk_${d.id}`));

  if (!doc) {
    return NextResponse.json(
      { error: 'NOT_FOUND', message: `Source with id ${id} not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    id: doc.id,
    provider: doc.provider,
    resourceId: doc.resourceId,
    title: doc.title,
    url: doc.url,
    author: doc.author,
    chunks: doc.chunks,
    updatedAt: new Date().toISOString(),
  });
}
