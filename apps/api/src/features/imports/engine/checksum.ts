import { createHash } from 'node:crypto';

/**
 * Compute SHA-256 hex digest of raw bytes.
 * @param buffer - The raw file content
 * @returns Lowercase hex string
 */
export function computeChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

