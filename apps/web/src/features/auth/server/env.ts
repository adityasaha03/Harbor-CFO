import { z } from 'zod';

const serverAuthEnvSchema = z.object({
  BETTER_AUTH_SECRET: z
    .string()
    .min(16, 'BETTER_AUTH_SECRET must be at least 16 characters long'),
  BETTER_AUTH_URL: z.string().url('BETTER_AUTH_URL must be a valid URL'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1, 'MONGODB_DB_NAME is required').default('harbor'),
});

export type ServerAuthEnv = z.infer<typeof serverAuthEnvSchema>;

let cachedEnv: ServerAuthEnv | null = null;

/**
 * Validates and returns the server auth environment variables.
 * Fails fast with a clear, readable error message listing missing or invalid keys.
 */
export function getServerAuthEnv(): ServerAuthEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  const result = serverAuthEnvSchema.safeParse({
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'harbor',
  });

  if (!result.success) {
    const errorDetails = result.error.errors
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[Harbor Auth] Server environment configuration error:\n${errorDetails}\nPlease check your .env configuration against .env.example.`
    );
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function resetServerAuthEnvCache(): void {
  cachedEnv = null;
}

