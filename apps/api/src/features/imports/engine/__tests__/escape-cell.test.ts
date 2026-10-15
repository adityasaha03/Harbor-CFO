import { describe, it, expect } from 'vitest';
import { escapeSpreadsheetCell } from '../escape-cell';

describe('escapeSpreadsheetCell', () => {
  it('prefixes formulas starting with = with a single quote', () => {
    expect(escapeSpreadsheetCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
  });

  it('prefixes cells starting with + with a single quote', () => {
    expect(escapeSpreadsheetCell('+12345')).toBe("'+12345");
  });

  it('prefixes cells starting with - with a single quote', () => {
    expect(escapeSpreadsheetCell('-cmd|calc')).toBe("'-cmd|calc");
  });

  it('prefixes cells starting with @ with a single quote', () => {
    expect(escapeSpreadsheetCell('@SUM(1,2)')).toBe("'@SUM(1,2)");
  });

  it('prefixes cells starting with tab or carriage return with a single quote', () => {
    expect(escapeSpreadsheetCell('\tvalue')).toBe("'\tvalue");
    expect(escapeSpreadsheetCell('\rvalue')).toBe("'\rvalue");
  });

  it('leaves benign text untouched', () => {
    expect(escapeSpreadsheetCell('Normal text')).toBe('Normal text');
    expect(escapeSpreadsheetCell('INV-101')).toBe('INV-101');
    expect(escapeSpreadsheetCell('40000.00')).toBe('40000.00');
    expect(escapeSpreadsheetCell('')).toBe('');
  });
});

