import path from 'path';
import { fileURLToPath } from 'url';

if (typeof process.loadEnvFile === 'function') {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    process.loadEnvFile(path.resolve(__dirname, '../.env'));
  } catch {
    // Handled if .env does not exist or environment is already configured
  }
}
