import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ingestDocument, getAllDocuments } from '@/retrieval/ingest';
import { config } from '@/config/index';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const jsonUploadSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  author: z.string().optional().default('File Upload'),
});

export async function GET(req: NextRequest) {
  const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
  const docs = await getAllDocuments(tenantId);
  return NextResponse.json({ documents: docs });
}

export async function POST(req: NextRequest) {
  try {
    const tenantId = req.headers.get('x-tenant-id') || config.DEFAULT_TENANT_ID;
    const contentType = req.headers.get('content-type') || '';

    // Case 1: FormData file upload
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const titleOverride = formData.get('title') as string | null;

      if (!file) {
        return NextResponse.json(
          { error: 'NO_FILE_PROVIDED', message: 'No file found in form data' },
          { status: 400 }
        );
      }

      const title = titleOverride || file.name;
      const textContent = await file.text();

      if (!textContent.trim()) {
        return NextResponse.json(
          { error: 'EMPTY_FILE', message: 'File is empty' },
          { status: 400 }
        );
      }

      const doc = await ingestDocument(tenantId, title, textContent, 'Direct File Upload', 'upload');
      return NextResponse.json({ document: doc }, { status: 201 });
    }

    // Case 2: JSON payload (manual text or API ingestion)
    const body = await req.json();
    const parsed = jsonUploadSchema.parse(body);

    const doc = await ingestDocument(tenantId, parsed.title, parsed.content, parsed.author, 'upload');
    return NextResponse.json({ document: doc }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'INGESTION_ERROR', message: err.message || 'Failed to ingest document' },
      { status: 400 }
    );
  }
}
