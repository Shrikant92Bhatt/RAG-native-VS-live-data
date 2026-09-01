import { NextResponse } from 'next/server';
import { metrics } from '@/observability/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(metrics.getSnapshot());
}
