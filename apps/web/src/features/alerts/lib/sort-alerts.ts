import type { Alert, AlertSeverity } from '@harbor/contracts';

const SEVERITY_ORDER: Record<AlertSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  info: 3,
};

/**
 * Sorts an array of alerts primarily by severity (critical > high > medium > info)
 * and secondarily by lastSeenAt timestamp descending.
 */
export function sortAlerts(alerts: Alert[]): Alert[] {
  return [...alerts].sort((a, b) => {
    const sevDiff = (SEVERITY_ORDER[a.severity] ?? 99) - (SEVERITY_ORDER[b.severity] ?? 99);
    if (sevDiff !== 0) return sevDiff;

    const timeA = new Date(a.lastSeenAt).getTime();
    const timeB = new Date(b.lastSeenAt).getTime();
    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeB - timeA;
    }

    return a.id.localeCompare(b.id);
  });
}
