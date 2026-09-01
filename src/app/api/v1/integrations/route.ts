import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    integrations: [
      {
        provider: 'gmail',
        name: 'Google Workspace / Gmail',
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
        syncedItems: 24,
        syncHealth: 'healthy',
      },
      {
        provider: 'notion',
        name: 'Notion Workspace',
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
        syncedItems: 18,
        syncHealth: 'healthy',
      },
      {
        provider: 'jira',
        name: 'Atlassian Jira Software',
        status: 'connected',
        lastSyncedAt: new Date().toISOString(),
        syncedItems: 42,
        syncHealth: 'healthy',
      },
    ],
  });
}
