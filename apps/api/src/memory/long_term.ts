import { db } from '../db/client.js';
import { logger } from '../observability/logger.js';
import { SEED_MEMORIES } from '../db/seed.js';
import { nanoid } from 'nanoid';

export interface MemoryRecord {
  id: string;
  tenantId: string;
  userId?: string;
  memoryType: 'preference' | 'project_context' | 'fact' | 'summary';
  content: string;
  importance: number;
  confidence: number;
  source: string;
  accessCount: number;
  createdAt: string;
}

export class LongTermMemory {
  private fallbackStore: MemoryRecord[] = SEED_MEMORIES.map(m => ({
    id: m.id,
    tenantId: 'tenant_default_production',
    memoryType: m.memoryType as any,
    content: m.content,
    importance: m.importance,
    confidence: m.confidence,
    source: 'chat',
    accessCount: 1,
    createdAt: new Date().toISOString(),
  }));

  async searchMemories(tenantId: string, query: string, limit = 4): Promise<MemoryRecord[]> {
    const q = query.toLowerCase();

    if (db.isAvailable()) {
      try {
        const res = await db.query(
          `SELECT id, tenant_id, user_id, memory_type, content, importance, confidence, source, access_count, created_at
           FROM memories
           WHERE tenant_id = $1 AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
           ORDER BY importance DESC, created_at DESC
           LIMIT $2`,
          [tenantId, limit * 2]
        );

        if (res.rows.length > 0) {
          return res.rows
            .map(r => ({
              id: r.id,
              tenantId: r.tenant_id,
              userId: r.user_id,
              memoryType: r.memory_type,
              content: r.content,
              importance: Number(r.importance),
              confidence: Number(r.confidence),
              source: r.source,
              accessCount: r.access_count,
              createdAt: r.created_at,
            }))
            .filter(m => q.split(/\W+/).some(term => term.length > 3 && m.content.toLowerCase().includes(term)))
            .slice(0, limit);
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, 'Database memory query fallback');
      }
    }

    // In-memory fallback
    const matched = this.fallbackStore
      .filter(m => m.tenantId === tenantId)
      .filter(m => {
        const words = q.split(/\W+/).filter(w => w.length > 3);
        if (words.length === 0) return true;
        return words.some(w => m.content.toLowerCase().includes(w));
      })
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);

    return matched.length > 0 ? matched : this.fallbackStore.slice(0, 2);
  }

  async storeMemory(
    tenantId: string,
    userId: string | undefined,
    memoryType: MemoryRecord['memoryType'],
    content: string,
    importance = 0.7,
    confidence = 0.95
  ): Promise<MemoryRecord> {
    const id = `mem_${nanoid(10)}`;

    if (db.isAvailable()) {
      try {
        await db.query(
          `INSERT INTO memories (id, tenant_id, user_id, memory_type, content, importance, confidence)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [id, tenantId, userId || null, memoryType, content, importance, confidence]
        );
      } catch (err) {
        logger.warn({ err: (err as Error).message }, 'Error saving memory to database; saved to fallback');
      }
    }

    const record: MemoryRecord = {
      id,
      tenantId,
      userId,
      memoryType,
      content,
      importance,
      confidence,
      source: 'chat',
      accessCount: 0,
      createdAt: new Date().toISOString(),
    };
    this.fallbackStore.unshift(record);
    logger.info({ memoryId: id, memoryType }, 'Stored new long-term memory (MAG)');
    return record;
  }

  async getAllMemories(tenantId: string): Promise<MemoryRecord[]> {
    if (db.isAvailable()) {
      try {
        const res = await db.query(
          `SELECT id, tenant_id, user_id, memory_type, content, importance, confidence, source, access_count, created_at
           FROM memories
           WHERE tenant_id = $1
           ORDER BY created_at DESC`,
          [tenantId]
        );
        if (res.rows.length > 0) {
          return res.rows.map(r => ({
            id: r.id,
            tenantId: r.tenant_id,
            userId: r.user_id,
            memoryType: r.memory_type,
            content: r.content,
            importance: Number(r.importance),
            confidence: Number(r.confidence),
            source: r.source,
            accessCount: r.access_count,
            createdAt: r.created_at,
          }));
        }
      } catch (err) {
        logger.debug({ err: (err as Error).message }, 'Fallback getting memories');
      }
    }
    return this.fallbackStore.filter(m => m.tenantId === tenantId);
  }

  async deleteMemory(tenantId: string, memoryId: string): Promise<boolean> {
    if (db.isAvailable()) {
      try {
        await db.query(`DELETE FROM memories WHERE id = $1 AND tenant_id = $2`, [memoryId, tenantId]);
      } catch {
        // ignore
      }
    }
    this.fallbackStore = this.fallbackStore.filter(m => m.id !== memoryId);
    return true;
  }
}

export const longTermMemory = new LongTermMemory();
