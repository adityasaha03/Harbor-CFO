import { parse } from 'csv-parse/sync';
import { MAX_FILE_BYTES, MAX_ROWS, MAX_COLUMNS, MAX_CELL_LENGTH } from './limits';
import { type NumberedRow, type RawCsvRow } from './types';

/** Byte-order mark (UTF-8 BOM). */
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

/**
 * Check whether a buffer is valid UTF-8.
 * Decodes and re-encodes; if round-trip fails, the input is not valid UTF-8.
 */
function isValidUtf8(buffer: Buffer): boolean {
  const decoded = buffer.toString('utf-8');
  return Buffer.from(decoded, 'utf-8').equals(buffer);
}

/**
 * Parse CSV bytes into numbered rows with lowercase header keys.
 *
 * @param buffer - Raw file bytes (must be UTF-8)
 * @param expectedHeaders - Allowed header names (compared case-insensitively)
 * @returns Array of rows with 1-based line numbers
 * @throws Error for limit violations, encoding issues, or structural problems
 */
export function parseCsv(
  buffer: Buffer,
  expectedHeaders: readonly string[],
): NumberedRow[] {
  if (buffer.length === 0) {
    throw new Error('File is empty');
  }

  if (buffer.length > MAX_FILE_BYTES) {
    throw new Error(
      `File exceeds maximum size of ${MAX_FILE_BYTES} bytes (got ${buffer.length})`,
    );
  }

  // Strip BOM if present, then check if only BOM
  let content = buffer;
  if (content.subarray(0, 3).equals(UTF8_BOM)) {
    content = content.subarray(3);
  }
  if (content.length === 0) {
    throw new Error('File contains only a BOM and no data');
  }

  if (!isValidUtf8(content)) {
    throw new Error('File is not valid UTF-8');
  }

  const text = content.toString('utf-8');

  // csv-parse in strict (non-relax) mode
  const records: Record<string, string>[] = parse(text, {
    columns: (headers: string[]) => headers.map((h) => h.trim()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: false,
    bom: true,
  });

  if (records.length === 0) {
    throw new Error('File contains a header but no data rows');
  }

  if (records.length > MAX_ROWS) {
    throw new Error(
      `File exceeds maximum of ${MAX_ROWS} rows (got ${records.length})`,
    );
  }

  // Validate headers from the first record
  const firstRecord = records[0];
  if (!firstRecord) {
    throw new Error('File contains a header but no data rows');
  }
  const actualHeaders = Object.keys(firstRecord);

  if (actualHeaders.length > MAX_COLUMNS) {
    throw new Error(
      `File exceeds maximum of ${MAX_COLUMNS} columns (got ${actualHeaders.length})`,
    );
  }

  const expectedLower = expectedHeaders.map((h) => h.toLowerCase());

  // Check for missing expected columns
  const actualLower = actualHeaders.map((h) => h.toLowerCase());
  const missing = expectedLower.filter((h) => !actualLower.includes(h));
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }

  // Check for extra columns (not in expected list)
  const extra = actualLower.filter((h) => !expectedLower.includes(h));
  if (extra.length > 0) {
    throw new Error(`Unknown columns: ${extra.join(', ')}`);
  }

  // Build a mapping from actual header to lowercase key
  const headerMap = new Map<string, string>();
  for (const header of actualHeaders) {
    headerMap.set(header, header.toLowerCase());
  }

  // Map records to NumberedRow with lowercase keys
  const rows: NumberedRow[] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i]!;
    const data: RawCsvRow = {};

    for (const [originalKey, value] of Object.entries(record)) {
      const normalizedKey = headerMap.get(originalKey) ?? originalKey.toLowerCase();

      if (typeof value === 'string' && value.length > MAX_CELL_LENGTH) {
        // lineNumber is 1-based: header row is 1, first data row is 2
        throw new Error(
          `Cell in column "${normalizedKey}" at row ${i + 2} exceeds maximum length of ${MAX_CELL_LENGTH} characters`,
        );
      }

      (data as Record<string, string | undefined>)[normalizedKey] = value;
    }

    rows.push({
      lineNumber: i + 2, // 1-based, header is row 1
      data,
    });
  }

  return rows;
}

