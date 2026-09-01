# Production Deployment Guide

> **System**: Production Agentic RAG over Live Data & Memory  
> **Platform**: Docker / Docker Compose / Kubernetes

---

## 1. Quick Start via Docker Compose

Run the entire production stack (PostgreSQL + pgvector, Redis, Fastify API, Next.js Web) with a single command:

```bash
# 1. Clone the repository
git clone https://github.com/Shrikant92Bhatt/RAG-native-VS-live-data.git
cd RAG-native-VS-live-data

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services in detached mode
docker compose up -d --build
```

### Verified Service Endpoints:
- **Next.js Web UI**: `http://localhost:3000`
- **Fastify API Server**: `http://localhost:3001`
- **Health Check**: `http://localhost:3001/api/v1/health`
- **Readiness Check**: `http://localhost:3001/api/v1/ready`
- **Observability Metrics**: `http://localhost:3001/api/v1/metrics`
- **PostgreSQL 16**: `localhost:5432`
- **Redis 7**: `localhost:6379`

---

## 2. Local Bare-Metal Development

If developing locally with Node.js 22+:

```bash
# Install all workspace dependencies
npm install

# Run database migrations and seed workspace knowledge
npm run db:migrate
npm run db:seed

# Start both Fastify API and Next.js frontend concurrently
npm run dev
```

---

## 3. Database Migration Strategy

Database migrations run automatically upon API startup. You can also trigger them manually:

```bash
# Run migration runner
npm run db:migrate --workspace=apps/api

# Seed sample workspace documents & memories
npm run db:seed --workspace=apps/api
```

---

## 4. Kubernetes & Cloud Deployment

### Kubernetes Deployment Topology:
- **API Deployment**: 2+ replicas with horizontal pod autoscaling (CPU > 75% or latency > 500ms).
- **Web Deployment**: 2+ replicas with Next.js standalone runner.
- **PostgreSQL**: Managed PostgreSQL (AWS Aurora, GCP Cloud SQL) with `vector` extension enabled.
- **Redis**: Managed Redis (AWS ElastiCache, GCP Memorystore) with persistence.

### Probes:
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 15
readinessProbe:
  httpGet:
    path: /api/v1/ready
    port: 3001
  initialDelaySeconds: 5
  periodSeconds: 10
```
