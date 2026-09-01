# Agentic RAG over Live Data & Memory — Production System

[![CI/CD Pipeline](https://github.com/Shrikant92Bhatt/RAG-native-VS-live-data/actions/workflows/ci.yml/badge.svg)](https://github.com/Shrikant92Bhatt/RAG-native-VS-live-data/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B%20LTS-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15%20App%20Router-black?logo=next.js)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22%2B%20LTS-339933?logo=node.js)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-336791?logo=postgresql)](https://github.com/pgvector/pgvector)
[![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

A deployable, production-grade agentic knowledge platform engineered to answer complex multi-hop queries across live enterprise workspace data (**Gmail**, **Notion**, **Jira**), persistent long-term memory (**MAG**), and indexed vector knowledge bases with grounded citations, cache-augmented generation (**CAG**), hybrid search, and strict multi-tenant isolation — built as a **unified Next.js 15 application** with embedded Node.js Route Handlers.

---

## 1. Unified Production Architecture

```text
       ┌─────────────────────────────────────────────────────────────────────────────┐
       │                       Unified Next.js 15 Application                        │
       │                                                                             │
       │   ┌─────────────────────────────────┐   ┌───────────────────────────────┐   │
       │   │   Architectural Workspace UI    │   │  Route Handlers (/api/v1/...) │   │
       │   │  • Chat Stream & Citations      │   │  • Node.js Server Runtime     │   │
       │   │  • Memory Vault (MAG)           │◄─►│  • Agent Orchestrator & SSE   │   │
       │   │  • Connectors & Telemetry       │   │  • Multi-Hop Planner & Router │   │
       │   └─────────────────────────────────┘   └───────────────┬───────────────┘   │
       └─────────────────────────────────────────────────────────┼───────────────────┘
                                                                 │
                                ┌────────────────────────────────┴───────────────────┐
                                │                                                    │
                ┌───────────────▼─────────────┐                      ┌───────────────▼─────────────┐
                │   PostgreSQL 16 + pgvector  │                      │    Redis 7 (CAG & Cache)    │
                │  - Tenancy & Documents      │                      │  - Sub-20ms Response Cache  │
                │  - Document Chunks & tsvec  │                      │  - Short-Term Sessions      │
                │  - Long-Term Memories (MAG) │                      │  - Tool / Retrieval Caches  │
                └─────────────────────────────┘                      └─────────────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       │                   LangGraph Agent Runtime                   │
                       │                                                             │
                       │  1. Intent & Complexity Router (Direct / CAG / RAG / MAG)   │
                       │  2. Query Planner & Multi-Hop Decomposer                    │
                       │  3. Multi-Tier Cache Layer (Exact, Semantic, Retrieval)     │
                       │  4. Hybrid Retriever (Vector + BM25 + Reciprocal Rank + RR) │
                       │  5. Memory Engine (Short-Term Redis + Long-Term pgvector)   │
                       │  6. Live MCP Tools Orchestrator (Gmail, Notion, Jira)       │
                       │  7. Synthesis & Citation Provenance Validator               │
                       └──────────────┬───────────────────────────────┬──────────────┘
                                      │                               │
                ┌─────────────────────▼───────┐          ┌────────────▼──────────────┐
                │   PostgreSQL 16 + pgvector  │          │   Redis (Cache & Queues)  │
                │  - Tenancy & Auth           │          │  - Response / Semantic    │
                │  - Documents & Chunks       │          │  - Tool Result Cache      │
                │  - Long-Term Memories       │          │  - Short-Term Sessions    │
                │  - Citations & Audit Logs   │          │  - Distributed Locks      │
                └─────────────────────────────┘          └───────────────────────────┘
```

---

## 2. Core Features

- **Triple Engine Architecture**:
  - **RAG (Retrieval-Augmented Generation)**: Vector cosine similarity (`pgvector`) fused with keyword search (`tsvector` BM25) via **Reciprocal Rank Fusion (RRF $k=60$)** and cross-scoring reranking.
  - **CAG (Cache-Augmented Generation)**: Multi-tier Redis caching delivering **sub-20ms** response times for repeated questions and 100% token cost reduction.
  - **MAG (Memory-Augmented Generation)**: Short-term Redis session continuity paired with persistent PostgreSQL long-term memory for user preferences and project architectural decisions.
- **Intelligent Query Router**: Auto-classifies queries into `DIRECT`, `CAG`, `RAG`, `MAG`, `LIVE_TOOL`, or `MULTI_HOP` to optimize speed and eliminate redundant LLM overhead.
- **Live Workspace Connectors**: Resilient Gmail, Notion, and Jira integrations equipped with circuit breakers, exponential backoff, rate limiting, and cursor-based incremental sync.
- **Strict Security & Prompt Injection Shield**: Isolates retrieved external text inside `<untrusted_context>` tags, sanitizes override attempts, enforces outbound SSRF protection, and ensures strict multi-tenant isolation.
- **Grounded Citation Provenance**: Every factual claim is bound to exact source chunk IDs, URLs, and authors, with an interactive slide-out inspector drawer.
- **Bespoke Architectural Workspace UI**: Precision engineering dark theme (warm slate, obsidian, hairline contours) avoiding traditional neon AI styling, featuring real-time SSE execution timelines.

---

## 3. Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Runtime** | Node.js 24+ LTS |
| **Language** | TypeScript (Strict Mode) |
| **Backend API** | Next.js 15 Route Handlers (Node.js runtime) |
| **Frontend UI** | Next.js 15 (App Router) + React 19 + Tailwind CSS |
| **Database & Vectors** | PostgreSQL 16 + pgvector (`vector(1536)`) |
| **Cache & Sessions** | Redis 7 + ioredis |
| **Agent Orchestration** | Custom LangGraph-style state machine runtime |
| **Validation** | Zod |
| **Testing** | Vitest |
| **Observability** | Pino structured logger + Custom Telemetry Collector |
| **Containerization** | Docker & Docker Compose |

---

## 4. Benchmark Performance SLAs

Automated benchmark evaluation comparing all 10 retrieval strategies:

| Percentile | Measured Latency | Target SLA | Status |
| :--- | :--- | :--- | :--- |
| **p50** | **22 ms** | < 500 ms | ✅ Passed |
| **p95** | **185 ms** | < 800 ms | ✅ Passed |
| **p99** | **320 ms** | < 1200 ms | ✅ Passed |

Detailed benchmark breakdown is documented in [`docs/retrieval-benchmarks.md`](docs/retrieval-benchmarks.md).

---

## 5. Getting Started

### Prerequisites
- Node.js 22+ LTS
- Docker & Docker Compose

### Quick Launch via Docker Compose
```bash
# 1. Clone repo
git clone https://github.com/Shrikant92Bhatt/RAG-native-VS-live-data.git
cd RAG-native-VS-live-data

# 2. Setup environment
cp .env.example .env

# 3. Launch full stack
docker compose up -d --build
```
Access the application:
- **Unified Workspace & API**: [http://localhost:3000](http://localhost:3000)
- **Health Check**: [http://localhost:3000/api/v1/health](http://localhost:3000/api/v1/health)
- **Readiness Check**: [http://localhost:3000/api/v1/ready](http://localhost:3000/api/v1/ready)

---

## 6. Local Development & Testing

```bash
# Install workspace dependencies
npm install

# Run database migrations
npm run db:migrate

# Seed sample workspace documents & memories
npm run db:seed

# Run unit tests
npm test

# Run automated benchmark evaluation harness
npm run benchmark

# Start Next.js development server on port 3000
npm run dev
```

---

## 7. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/v1/chat` | Synchronous agent chat execution |
| `POST` | `/api/v1/chat/stream` | Server-Sent Events (SSE) streaming with live pipeline events |
| `GET` | `/api/v1/conversations` | List conversation threads |
| `GET` | `/api/v1/memory` | Retrieve long-term memories (MAG) |
| `POST` | `/api/v1/memory` | Store new fact, preference, or project decision |
| `GET` | `/api/v1/integrations` | Inspect Gmail, Notion, and Jira connector statuses |
| `POST` | `/api/v1/sync/:provider` | Trigger incremental sync for a provider |
| `GET` | `/api/v1/sources/:id` | Fetch full source document and chunk metadata |
| `GET` | `/api/v1/health` | Lightweight liveness probe |
| `GET` | `/api/v1/ready` | Dependency readiness probe |
| `GET` | `/api/v1/metrics` | System latency percentiles, cache hit rates, token cost |

---

## 8. Documentation Index

- [`docs/audit.md`](docs/audit.md): Complete repository audit, capabilities, and gap analysis.
- [`docs/architecture.md`](docs/architecture.md): Deep-dive system architecture, RAG vs CAG vs MAG, and data flows.
- [`docs/retrieval-benchmarks.md`](docs/retrieval-benchmarks.md): Real measured benchmarks across all 10 strategies.
- [`docs/security.md`](docs/security.md): Threat modeling, prompt injection defense, and SSRF prevention.
- [`docs/deployment.md`](docs/deployment.md): Production container deployment, Kubernetes manifests, and migrations.
- [`docs/operations.md`](docs/operations.md): Operational runbook, health checks, circuit breakers, and rollback strategies.

---

## 9. License

MIT License. Designed and engineered for production grade agentic systems.
