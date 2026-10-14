import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z
    .string({ required_error: 'MONGODB_URI is required' })
    .min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1).default('harbor'),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3000'),
  BETTER_AUTH_JWKS_URL: z.string().url().optional(),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  LLM_PROVIDER: z.enum(['gemini', 'replay']).default('replay'),
  LLM_MODEL: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  AGENT_MAX_TOOL_CALLS: z.coerce.number().int().positive().default(6),
  AGENT_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${errorDetails}`);
  }
  return parsed.data;
}

export const env: Env = (() => {
  const raw: Record<string, unknown> = { ...process.env };
  if (raw.NODE_ENV === 'test' && !raw.MONGODB_URI) {
    raw.MONGODB_URI = 'mongodb://127.0.0.1:27017/harbor_test';
  }
  return parseEnv(raw);
})();
