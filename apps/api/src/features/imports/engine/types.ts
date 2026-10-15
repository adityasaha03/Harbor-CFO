/**
 * Import engine types — internal types used only within the import engine.
 * Shared types live in @harbor/contracts/imports.
 */

/** Raw row from csv-parse, before mapping. Header keys are lowercased. */
export type RawCsvRow = Readonly<Record<string, string | undefined>>;

/** A parsed CSV row with its 1-based line number. */
export interface NumberedRow {
  readonly lineNumber: number;
  readonly data: RawCsvRow;
}

