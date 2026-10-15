import { describe, it, expect } from 'vitest';
import { computeChecksum } from '../checksum';

describe('computeChecksum', () => {
  it('computes deterministic sha256 hex of buffer', () => {
    const buf = Buffer.from('externalId,date\n1,2026-10-01', 'utf-8');
    const hash1 = computeChecksum(buf);
    const hash2 = computeChecksum(buf);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/);
  });
});

