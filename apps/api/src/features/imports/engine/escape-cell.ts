/**
 * Characters that trigger formula interpretation in Excel, Google Sheets and LibreOffice.
 * Cells starting with any of these are prefixed with a single quote to neutralize them.
 */
const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * Escape a cell value to prevent spreadsheet formula injection in exported CSVs.
 * Prefixes cells starting with dangerous characters with a single quote.
 *
 * @param value - The cell value to escape
 * @returns The escaped cell value, safe for spreadsheet rendering
 */
export function escapeSpreadsheetCell(value: string): string {
  if (value.length === 0) {
    return value;
  }

  const firstChar = value[0]!;
  if (FORMULA_PREFIXES.has(firstChar)) {
    return `'${value}`;
  }

  return value;
}

