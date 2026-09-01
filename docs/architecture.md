# Architecture & Technical Design Specification

> **System**: Production Agentic RAG over Live Data & Memory  
> **Runtime**: Node.js 24+ LTS • TypeScript Strict Mode

---

## 1. High-Level Architecture Diagram

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
```

---

## 2. Triple Engine Modes: RAG vs CAG vs MAG

These three paradigms are designed as complementary capabilities within the single agent orchestrator:

### 1. RAG (Retrieval-Augmented Generation)
- **Purpose**: Answers queries requiring factual evidence from indexed workspace documents.
- **Workflow**:
  1. User query parsed and normalized.
  2. Parallel execution of vector cosine similarity search (`pgvector`) and keyword search (`tsvector` BM25).
  3. Results fused using **Reciprocal Rank Fusion (RRF $k=60$)**:
     $$\text{RRF}(d) = \sum_{m \in \{\text{vector}, \text{bm25}\}} \frac{1}{60 + \text{rank}_m(d)}$$
  4. Cross-encoder scoring reranker filters out candidates below confidence threshold.
  5. Grounded synthesis with citation anchors `[1]`, `[2]`.

### 2. CAG (Cache-Augmented Generation)
- **Purpose**: Eliminates LLM latency and token costs for repeated questions and stable context.
- **Workflow**:
  1. Hash query and check Redis L1 exact response cache.
  2. If hit: returns within **10–25ms**, delivering 100% token savings.
  3. L2 stores retrieval candidates and tool responses with dedicated freshness TTLs.

### 3. MAG (Memory-Augmented Generation)
- **Purpose**: Persists facts, user preferences, and project architectural decisions across sessions.
- **Workflow**:
  - **Short-Term Memory**: Redis session history preserves the active conversation thread (24h TTL).
  - **Long-Term Memory**: PostgreSQL + pgvector stores typed memories (`preference`, `project_context`, `fact`, `summary`) with importance ratings and confidence scores.

---

## 3. Intelligent Query Routing

Queries are classified without incurring redundant retrieval overhead:

```text
User Query
    │
    ▼
Query Router
    ├── Conversational Greeting ─────────► DIRECT Mode (Immediate LLM response)
    ├── Cached Query ────────────────────► CAG Mode (Sub-20ms Redis delivery)
    ├── Memory Inquiries ────────────────► MAG Mode (PostgreSQL facts recall)
    ├── Live Gmail/Notion/Jira Query ────► LIVE_TOOL Mode (Direct MCP connector)
    ├── Complex Multi-Source Task ──────► MULTI_HOP Mode (Planner decomposition)
    └── Standard Knowledge Lookup ──────► HYBRID RAG Mode (Vector + BM25 + RRF)
```

---

## 4. Citation and Grounding Guarantee

1. Every retrieved document chunk retains metadata: `sourceId`, `title`, `url`, `author`, `provider`, and `excerpt`.
2. Synthesized claims are cross-checked against chunk texts.
3. If no evidence supports a claim, the system returns a safe qualification rather than hallucinating facts or fabricating URLs.
