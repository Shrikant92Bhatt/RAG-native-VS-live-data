import { redis } from '../cache/redis.js';
import { logger } from '../observability/logger.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export class ShortTermMemory {
  private getKey(conversationId: string): string {
    return `stm:history:${conversationId}`;
  }

  async getRecentMessages(conversationId: string, limit = 10): Promise<ChatMessage[]> {
    const raw = await redis.get(this.getKey(conversationId));
    if (!raw) return [];
    try {
      const messages: ChatMessage[] = JSON.parse(raw);
      return messages.slice(-limit);
    } catch {
      return [];
    }
  }

  async appendMessage(conversationId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<void> {
    const existing = await this.getRecentMessages(conversationId, 20);
    existing.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });
    // Store with 24 hours TTL
    await redis.set(this.getKey(conversationId), JSON.stringify(existing), 86400);
    logger.debug({ conversationId, role }, 'Appended message to short-term memory');
  }

  async clearSession(conversationId: string): Promise<void> {
    await redis.del(this.getKey(conversationId));
  }
}

export const shortTermMemory = new ShortTermMemory();
