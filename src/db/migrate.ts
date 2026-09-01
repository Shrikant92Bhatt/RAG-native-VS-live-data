import { db } from './client';
import { logger } from '../observability/logger';

export async function runMigrations() {
  logger.info('Running database migrations...');
  const isUp = await db.testConnection();
  if (!isUp) {
    logger.warn('PostgreSQL is not reachable. Skipping live database migration.');
    return false;
  }

  const migrationSql = `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    DO $$
    BEGIN
      CREATE EXTENSION IF NOT EXISTS "vector";
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'vector extension could not be enabled, continuing with text search';
    END $$;

    CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        plan VARCHAR(32) DEFAULT 'enterprise',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(32) DEFAULT 'member',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
    );

    CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        mode VARCHAR(32) DEFAULT 'AUTO',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(64) PRIMARY KEY,
        conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(32) NOT NULL,
        content TEXT NOT NULL,
        execution_plan JSONB,
        citations JSONB,
        latency_ms INTEGER,
        tokens_in INTEGER,
        tokens_out INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS memories (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
        memory_type VARCHAR(64) NOT NULL,
        content TEXT NOT NULL,
        importance REAL DEFAULT 0.5,
        confidence REAL DEFAULT 0.9,
        source VARCHAR(64) DEFAULT 'chat',
        access_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        resource_id VARCHAR(255) NOT NULL,
        title VARCHAR(512) NOT NULL,
        url TEXT,
        author VARCHAR(255),
        metadata JSONB,
        version VARCHAR(128),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_provider_resource UNIQUE (tenant_id, provider, resource_id)
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
        id VARCHAR(64) PRIMARY KEY,
        document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS integrations (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        provider VARCHAR(64) NOT NULL,
        status VARCHAR(32) DEFAULT 'connected',
        credentials_encrypted TEXT,
        sync_cursor TEXT,
        last_synced_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(64) PRIMARY KEY,
        tenant_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64),
        action VARCHAR(128) NOT NULL,
        details JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_tenant_user ON conversations(tenant_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_memories_tenant_type ON memories(tenant_id, memory_type);
    CREATE INDEX IF NOT EXISTS idx_docs_tenant_provider ON documents(tenant_id, provider);
    CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING GIN(tsv_content);

    INSERT INTO tenants (id, name, plan)
    VALUES ('tenant_default_production', 'Production Workspace', 'enterprise')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO users (id, tenant_id, email, name, role)
    VALUES ('user_production_admin', 'tenant_default_production', 'admin@production.internal', 'Lead Engineer', 'admin')
    ON CONFLICT (tenant_id, email) DO NOTHING;
  `;

  try {
    await db.query(migrationSql);
    logger.info('Database migrations applied successfully.');
    return true;
  } catch (err) {
    logger.error({ err }, 'Error executing database migrations');
    throw err;
  }
}

if (process.argv[1]?.endsWith('migrate.ts') || process.argv[1]?.endsWith('migrate')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
