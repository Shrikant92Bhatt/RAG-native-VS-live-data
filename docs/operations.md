# Operational Runbook & Incident Management

> **System**: Production Agentic RAG over Live Data & Memory

---

## 1. Health & Readiness Verification

### Health Check (Liveness)
```bash
curl -i http://localhost:3001/api/v1/health
```
**Expected Response**: `200 OK`
```json
{
  "status": "ok",
  "service": "rag-live-data-api",
  "uptimeSeconds": 1420
}
```

### Readiness Check (Dependencies)
```bash
curl -i http://localhost:3001/api/v1/ready
```
**Expected Response**: `200 OK`
```json
{
  "status": "ready",
  "dependencies": {
    "database": { "status": "connected", "type": "PostgreSQL + pgvector" },
    "cache": { "status": "connected", "type": "Redis CAG Cache" },
    "connectors": { "gmail": "healthy", "notion": "healthy", "jira": "healthy" }
  }
}
```

---

## 2. Telemetry, Cost & Cache Monitoring

View aggregated performance statistics directly:
```bash
curl http://localhost:3001/api/v1/metrics
```
Metrics provided:
- Request counts and cache hit rates (CAG efficiency)
- Latency percentiles: `p50`, `p95`, and `p99`
- Cumulative token usage and estimated dollar cost

---

## 3. Circuit Breaker Recovery Procedure

If external workspace APIs (Gmail, Notion, Jira) experience outages, the connector circuit breaker automatically trips to `OPEN`.

### Behavior during OPEN state:
- Live API calls are short-circuited to avoid latency spikes.
- The system gracefully serves indexed knowledge chunks and notifies the user.
- After a 30-second cooldown, the breaker transitions to `HALF_OPEN` and tests upstream connectivity.

### Manual Reset:
Restarting the API or triggering an incremental sync resets the breaker:
```bash
curl -X POST http://localhost:3001/api/v1/sync/jira
```

---

## 4. Rollback Strategy

1. **Application Rollback**:
   ```bash
   # Revert to previous release tag
   git checkout tags/v1.0.0
   docker compose up -d --build
   ```
2. **Database Migration Safety**:
   - Table schemas are additive (`CREATE TABLE IF NOT EXISTS`).
   - Adding new vector dimensions requires creating a new column or table rather than altering existing vectors.
