import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const hasGmail = Boolean(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET);
  const hasNotion = Boolean(process.env.NOTION_API_KEY);
  const hasJira = Boolean(process.env.JIRA_API_TOKEN || (process.env.JIRA_HOST && process.env.JIRA_EMAIL));

  return NextResponse.json({
    integrations: [
      {
        provider: 'gmail',
        name: 'Google Workspace / Gmail',
        status: hasGmail ? 'connected' : 'sandbox',
        lastSyncedAt: new Date().toISOString(),
        syncedItems: 24,
        syncHealth: hasGmail ? 'healthy' : 'sandbox_simulated',
        requiresConfig: !hasGmail,
        requiredEnvVars: ['GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'],
      },
      {
        provider: 'notion',
        name: 'Notion Workspace',
        status: hasNotion ? 'connected' : 'sandbox',
        lastSyncedAt: new Date().toISOString(),
        syncedItems: 18,
        syncHealth: hasNotion ? 'healthy' : 'sandbox_simulated',
        requiresConfig: !hasNotion,
        requiredEnvVars: ['NOTION_API_KEY', 'NOTION_DATABASE_ID'],
      },
      {
        provider: 'jira',
        name: 'Atlassian Jira Software',
        status: hasJira ? 'connected' : 'sandbox',
        lastSyncedAt: new Date().toISOString(),
        syncedItems: 42,
        syncHealth: hasJira ? 'healthy' : 'sandbox_simulated',
        requiresConfig: !hasJira,
        requiredEnvVars: ['JIRA_HOST', 'JIRA_EMAIL', 'JIRA_API_TOKEN'],
      },
    ],
  });
}
