import { NextRequest, NextResponse } from 'next/server';
import { gmailConnector } from '@/connectors/gmail';
import { notionConnector } from '@/connectors/notion';
import { jiraConnector } from '@/connectors/jira';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  let result;

  if (provider === 'gmail') {
    result = await gmailConnector.syncIncremental();
  } else if (provider === 'notion') {
    result = await notionConnector.syncIncremental();
  } else if (provider === 'jira') {
    result = await jiraConnector.syncIncremental();
  } else {
    return NextResponse.json(
      { error: 'UNKNOWN_PROVIDER', message: `Provider ${provider} not supported.` },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ...result,
    syncedAt: new Date().toISOString(),
  });
}
