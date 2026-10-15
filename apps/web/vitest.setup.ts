import '@testing-library/jest-dom/vitest';
import * as path from 'path';
import * as fs from 'fs';

const envPath = path.resolve(__dirname, '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Ignore if already loaded
  }
}

process.env.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'test_secret_key_at_least_16_chars_long';
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:3000';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/harbor_test';
process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'harbor_test';

