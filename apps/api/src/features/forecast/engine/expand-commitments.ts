import { type ForecastCommitment } from '@harbor/contracts';
import { addDays, diffDays } from '@harbor/contracts/common/dates';
import { type DatedFlow } from './types';

/**
 * Expand a recurring commitment into individual dated flows within the forecast horizon.
 *
 * Occurrences are generated strictly after `asOfDate` and before `asOfDate + horizonDays`.
 * Monthly commitments use the same day-of-month as the anchor, clamped to the last day of
 * shorter months (e.g. Jan 31 → Feb 28).
 *
 * @param commitment - The commitment to expand
 * @param asOfDate - Day 0 of the forecast (YYYY-MM-DD)
 * @param horizonDays - Number of days in the forecast (typically 91)
 * @returns Array of DatedFlow entries for each occurrence
 */
export function expandCommitment(
  commitment: ForecastCommitment,
  asOfDate: string,
  horizonDays: number,
): DatedFlow[] {
  const flows: DatedFlow[] = [];
  const lastDate = addDays(asOfDate, horizonDays - 1);
  const dates = generateOccurrences(commitment, asOfDate, lastDate);

  for (const date of dates) {
    const dayIndex = diffDays(date, asOfDate);
    if (dayIndex < 1 || dayIndex >= horizonDays) continue;

    const signedAmount = commitment.direction === 'inflow'
      ? commitment.amountMinor
      : -commitment.amountMinor;

    flows.push({
      dayIndex,
      date,
      amountMinor: signedAmount,
      category: commitment.direction === 'inflow' ? 'receipt' : 'payment',
      source: {
        type: 'commitment',
        id: commitment.id,
        label: commitment.label,
        amountMinor: signedAmount,
      },
    });
  }

  return flows;
}

/**
 * Generate occurrence dates for a commitment between asOfDate (exclusive) and lastDate (inclusive).
 */
function generateOccurrences(
  commitment: ForecastCommitment,
  asOfDate: string,
  lastDate: string,
): string[] {
  const { frequency, anchorOn, endOn } = commitment;

  if (frequency === 'once') {
    if (diffDays(anchorOn, asOfDate) >= 1 && diffDays(anchorOn, lastDate) <= 0) {
      if (!endOn || diffDays(anchorOn, endOn) <= 0) {
        return [anchorOn];
      }
    }
    return [];
  }

  const dates: string[] = [];
  const anchorDate = parseUtcDate(anchorOn);
  const anchorDay = anchorDate.getUTCDate();

  let current = anchorOn;

  // If anchor is on or before asOfDate, advance to the first occurrence after asOfDate
  while (diffDays(current, asOfDate) <= 0) {
    current = nextOccurrence(current, frequency, anchorDay);
  }

  while (diffDays(current, lastDate) <= 0) {
    if (endOn && diffDays(current, endOn) > 0) break;
    dates.push(current);
    current = nextOccurrence(current, frequency, anchorDay);
  }

  return dates;
}

/**
 * Compute the next occurrence date after `current` for the given frequency.
 */
function nextOccurrence(
  current: string,
  frequency: 'weekly' | 'biweekly' | 'monthly',
  anchorDay: number,
): string {
  if (frequency === 'weekly') {
    return addDays(current, 7);
  }
  if (frequency === 'biweekly') {
    return addDays(current, 14);
  }

  // Monthly: advance one month, clamp to the last day of the target month
  const d = parseUtcDate(current);
  let year = d.getUTCFullYear();
  let month = d.getUTCMonth() + 1; // 1-based

  month += 1;
  if (month > 12) {
    month = 1;
    year += 1;
  }

  // Clamp day to the last valid day of the target month
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(anchorDay, daysInMonth);

  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function parseUtcDate(dateStr: string): Date {
  const [yStr, mStr, dStr] = dateStr.split('-');
  return new Date(Date.UTC(Number(yStr), Number(mStr) - 1, Number(dStr)));
}

