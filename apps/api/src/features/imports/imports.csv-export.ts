import type { ImportErrorItem } from '@harbor/contracts';
import { escapeSpreadsheetCell } from './engine';

function formatCsvCell(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function formatErrorsCsv(errors: ImportErrorItem[]): string {
  const header = 'row,field,message';
  const lines = errors.map((err) => {
    const escapedRow = escapeSpreadsheetCell(String(err.row));
    const escapedField = escapeSpreadsheetCell(err.field);
    const escapedMessage = escapeSpreadsheetCell(err.message);
    return [
      formatCsvCell(escapedRow),
      formatCsvCell(escapedField),
      formatCsvCell(escapedMessage),
    ].join(',');
  });
  return [header, ...lines].join('\r\n');
}
