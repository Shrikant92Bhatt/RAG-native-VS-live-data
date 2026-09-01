-- ==========================================================
-- PostgreSQL 16 + pgvector Initialization Script
-- ==========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 1. Multi-tenant Accounts
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    plan VARCHAR(32) DEFAULT 'enterprise',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_email UNIQUE (tenant_id, email)
);

-- 3. Conversations & Threads
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    mode VARCHAR(32) DEFAULT 'AUTO',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Messages
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(64) PRIMARY KEY,
    conversation_id VARCHAR(64) NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    role VARCHAR(32) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    execution_plan JSONB,
    citations JSONB,
    latency_ms INTEGER,
    tokens_in INTEGER,
    tokens_out INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Long-term Memory (MAG)
CREATE TABLE IF NOT EXISTS memories (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    memory_type VARCHAR(64) NOT NULL, -- 'preference', 'project_context', 'fact', 'summary'
    content TEXT NOT NULL,
    embedding vector(1536),
    importance REAL DEFAULT 0.5,
    confidence REAL DEFAULT 0.9,
    source VARCHAR(64) DEFAULT 'chat',
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Indexed Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL, -- 'gmail', 'notion', 'jira', 'manual'
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

-- 7. Document Chunks (Hybrid RAG: Vector + BM25 tsvector)
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    tsv_content tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    embedding vector(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Connectors & Integration Sync States
CREATE TABLE IF NOT EXISTS integrations (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(64) NOT NULL,
    status VARCHAR(32) DEFAULT 'connected', -- 'connected', 'syncing', 'error', 'disconnected'
    credentials_encrypted TEXT,
    sync_cursor TEXT,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_provider UNIQUE (tenant_id, provider)
);

-- 9. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64),
    action VARCHAR(128) NOT NULL,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for high-throughput multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_user ON conversations(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_memories_tenant_type ON memories(tenant_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_docs_tenant_provider ON documents(tenant_id, provider);
CREATE INDEX IF NOT EXISTS idx_chunks_doc ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tenant ON document_chunks(tenant_id);

-- Full-text GIN index for BM25 keyword retrieval
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON document_chunks USING GIN(tsv_content);

-- Vector HNSW / IVFFLAT index for cosine distance vector retrieval
CREATE INDEX IF NOT EXISTS idx_chunks_embedding ON document_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);

-- Insert Default Tenant & User for immediate out-of-the-box readiness
INSERT INTO tenants (id, name, plan)
VALUES ('tenant_default_production', 'Production Workspace', 'enterprise')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, tenant_id, email, name, role)
VALUES ('user_production_admin', 'tenant_default_production', 'admin@production.internal', 'Lead Engineer', 'admin')
ON CONFLICT (tenant_id, email) DO NOTHING;
