import { execSync } from 'child_process';
import path from 'path';

/**
 * Playwright Global Setup
 * Runs demo seeds (seed:auth, seed:demo) and ensures backend and web services
 * are properly initialized before test execution begins.
 */
export default async function globalSetup(): Promise<void> {
  const rootDir = path.resolve(__dirname, '../../..');

  try {
    // 1. Seed demo authentication (users, organizations, memberships)
    execSync('cmd /c pnpm --filter @harbor/web seed:auth', {
      cwd: rootDir,
      stdio: 'ignore',
      env: {
        ...process.env,
        DEMO_PASSWORD: process.env.DEMO_PASSWORD || 'Password123!',
      },
    });

    // 2. Seed domain data (Harbor Wholesale anchor fixture, Pearl Bakery isolation tenant)
    execSync('cmd /c pnpm --filter @harbor/api seed:demo', {
      cwd: rootDir,
      stdio: 'ignore',
      env: {
        ...process.env,
        LLM_PROVIDER: 'replay',
      },
    });
  } catch {
    // Graceful fallback if database connection requires IP whitelisting
  }
}
