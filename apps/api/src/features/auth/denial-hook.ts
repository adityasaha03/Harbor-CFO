import type { RecordAuditInput } from '@harbor/contracts';
import { logger } from '../../core/logging/logger';

export type DenialAuditLogger = (input: RecordAuditInput) => Promise<unknown>;

let activeDenialLogger: DenialAuditLogger | null = null;

/**
 * Registers a handler to record audit events on authentication and authorization denials.
 */
export function setDenialAuditLogger(fn: DenialAuditLogger): void {
  activeDenialLogger = fn;
}

/**
 * Safely dispatches an audit record for an authentication or authorization denial.
 */
export async function recordAuthDenial(input: RecordAuditInput): Promise<void> {
  if (activeDenialLogger) {
    try {
      await activeDenialLogger(input);
    } catch (err) {
      logger.error({ err }, 'Failed to record auth denial in audit log');
    }
  }
}

