import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { runForecast } from '../run-forecast';
import { HARBOR_ANCHOR_INPUT } from './fixtures/harbor-anchor';

describe('Purity and Architecture Invariants', () => {
  it('property test: sum of all net flows equals closing[last] - closing[0]', () => {
    const points = runForecast(HARBOR_ANCHOR_INPUT);
    const day0 = points[0]!;
    const dayLast = points[points.length - 1]!;

    let netFlowsSum = 0;
    // Flows apply on days 1..last
    for (let i = 1; i < points.length; i++) {
      const p = points[i]!;
      netFlowsSum +=
        p.receiptsMinor
        - p.paymentsMinor
        + p.financingMinor
        - p.feesMinor
        - p.repaymentsMinor;
    }

    const netClosingChange = dayLast.closingMinor - day0.closingMinor;
    expect(netFlowsSum).toBe(netClosingChange);
  });

  it('engine files contain no imports from express, mongoose, or process.env', () => {
    const engineDir = join(__dirname, '..');
    const files = readdirSync(engineDir).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts'),
    );

    expect(files.length).toBeGreaterThan(0);

    const forbiddenPatterns = [
      /from\s+['"]express['"]/,
      /from\s+['"]mongoose['"]/,
      /process\.env/,
    ];

    for (const file of files) {
      const content = readFileSync(join(engineDir, file), 'utf-8');
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content)).toBe(false);
      }
    }
  });
});

