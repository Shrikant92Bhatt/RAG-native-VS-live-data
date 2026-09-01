import { db } from './client.js';
import { logger } from '../observability/logger.js';
import { nanoid } from 'nanoid';

export const SEED_DOCUMENTS = [
  {
    id: 'doc_notion_architecture',
    provider: 'notion',
    resourceId: 'page_arch_2026',
    title: 'Core Engine Architecture & Service Level Agreements',
    url: 'https://notion.so/acme/architecture-v3',
    author: 'Platform Architecture Team',
    chunks: [
      'The multi-tenant RAG engine operates with strict SLA requirements: p95 latency under 800ms for hybrid searches and under 25ms for cached CAG queries.',
      'Data isolation is strictly enforced at the SQL layer using mandatory tenant_id predicates on all operations and isolated Redis key namespaces (tenant:user:key).',
      'The memory architecture distinguishes between short-term conversational context (persisted in Redis with 24h TTL) and long-term facts/preferences stored in PostgreSQL.'
    ]
  },
  {
    id: 'doc_jira_sprint',
    provider: 'jira',
    resourceId: 'PROJ-1042',
    title: '[PROJ-1042] Deploy Hybrid Reranker and Multi-hop Query Router',
    url: 'https://jira.acme.corp/browse/PROJ-1042',
    author: 'Sarah Jenkins (Principal SRE)',
    chunks: [
      'Ticket PROJ-1042 is currently IN PROGRESS in Sprint 44 with Assignee: Sarah Jenkins. Priority: High.',
      'Acceptance Criteria: 1. Hybrid BM25 + Vector retrieval fused with Reciprocal Rank Fusion (RRF k=60). 2. Reranker filters out low-scoring candidates below 0.35 confidence threshold.',
      'Deployment Target: Multi-region Kubernetes cluster with Redis cluster caching layer. Blocked by database migration verification.'
    ]
  },
  {
    id: 'doc_gmail_client_update',
    provider: 'gmail',
    resourceId: 'msg_gm_9921',
    title: 'Q3 Enterprise Deployment Schedule & Security Review',
    url: 'https://mail.google.com/mail/u/0/#inbox/msg_gm_9921',
    author: 'David Vance <dvance@security-audit.com>',
    chunks: [
      'Security audit completed on Monday: All OAuth tokens for Gmail, Notion, and Jira must be encrypted at rest and never exposed to the frontend browser.',
      'Prompt-injection defense was validated: user documents are treated as untrusted data and isolated from system operational instructions.',
      'Next staging deployment is scheduled for Thursday at 14:00 UTC with zero-downtime rolling restart strategy.'
    ]
  }
];

export const SEED_MEMORIES = [
  {
    id: 'mem_user_pref_1',
    memoryType: 'preference',
    content: 'User prefers concise, production-grade code examples with strict TypeScript typing and no boilerplate comments.',
    importance: 0.9,
    confidence: 0.95
  },
  {
    id: 'mem_proj_fact_1',
    memoryType: 'project_context',
    content: 'The production database is PostgreSQL 16 with pgvector extension enabled and tenant_id isolation.',
    importance: 0.85,
    confidence: 0.98
  }
];

export async function seedDatabase() {
  logger.info('Seeding database with live mock workspace data...');
  const isUp = await db.testConnection();
  if (!isUp) {
    logger.warn('PostgreSQL is not reachable. Skipping live database seed.');
    return;
  }

  const tenantId = 'tenant_default_production';

  for (const doc of SEED_DOCUMENTS) {
    await db.query(
      `INSERT INTO documents (id, tenant_id, provider, resource_id, title, url, author, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (tenant_id, provider, resource_id) DO UPDATE SET title = EXCLUDED.title`,
      [doc.id, tenantId, doc.provider, doc.resourceId, doc.title, doc.url, doc.author, JSON.stringify({ seeded: true })]
    );

    for (let i = 0; i < doc.chunks.length; i++) {
      const chunkId = `chunk_${doc.id}_${i}`;
      await db.query(
        `INSERT INTO document_chunks (id, document_id, tenant_id, chunk_index, content)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [chunkId, doc.id, tenantId, i, doc.chunks[i]]
      );
    }
  }

  for (const mem of SEED_MEMORIES) {
    await db.query(
      `INSERT INTO memories (id, tenant_id, memory_type, content, importance, confidence)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO NOTHING`,
      [mem.id, tenantId, mem.memoryType, mem.content, mem.importance, mem.confidence]
    );
  }

  logger.info('Database seeded successfully.');
}

if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
