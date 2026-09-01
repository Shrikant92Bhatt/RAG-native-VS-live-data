import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const configSchema = z.object({
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().default('postgres://postgres:postgrespassword@localhost:5432/rag_live_data'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16).default('super-secret-jwt-key-minimum-32-chars-for-production'),
  DEFAULT_TENANT_ID: z.string().default('tenant_default_production'),
  DEFAULT_USER_ID: z.string().default('user_production_admin'),
  DEFAULT_LLM_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional().default('sk-mock'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  EMBEDDING_DIMENSION: z.coerce.number().default(1536),
  CACHE_TTL_SECONDS: z.coerce.number().default(3600),
  CAG_SEMANTIC_THRESHOLD: z.coerce.number().default(0.90),
  RATE_LIMIT_MAX: z.coerce.number().default(120),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export type Config = z.infer<typeof configSchema>;

function loadConfig(): Config {
  const result = configSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid configuration environment variables:', result.error.format());
    return configSchema.parse({});
  }
  return result.data;
}

export const config = loadConfig();
