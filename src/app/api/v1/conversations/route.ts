import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    conversations: [
      {
        id: 'conv_sample_eng',
        title: 'Sprint 44 Architecture & Hybrid Search Verification',
        mode: 'AUTO',
        createdAt: new Date().toISOString(),
        lastMessage: 'Verified acceptance criteria for PROJ-1042.',
      },
    ],
  });
}
