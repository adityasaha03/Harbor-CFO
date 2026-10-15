import type { ClientSession } from 'mongoose';
import {
  recordAuditInputSchema,
  auditQuerySchema,
  type AuditEventDto,
  type RecordAuditInput,
  type AuditQuery,
} from '@harbor/contracts';
import { auditRepository } from './audit.repository';

export interface AuditListResult {
  items: AuditEventDto[];
  total: number;
  page: number;
  pageSize: number;
}

export const auditService = {
  /**
   * Persists an audit event entry.
   * Enforces validation and strips potential sensitive artifacts.
   */
  async record(
    input: RecordAuditInput,
    session?: ClientSession,
  ): Promise<AuditEventDto> {
    const validated = recordAuditInputSchema.parse(input);

    // Sanitize resourceRefs and reasonCode to ensure no secrets or unbound texts
    const sanitizedRefs = (validated.resourceRefs ?? []).map((ref) =>
      typeof ref === 'string' ? ref.slice(0, 200) : String(ref),
    );

    return auditRepository.record(
      {
        ...validated,
        resourceRefs: sanitizedRefs,
      },
      session,
    );
  },

  /**
   * Retrieves paginated audit log entries for an authenticated tenant.
   */
  async list(tenantId: string, query: AuditQuery = {}): Promise<AuditListResult> {
    const parsedQuery = auditQuerySchema.parse(query);
    const page = parsedQuery.page ?? 1;
    const pageSize = parsedQuery.pageSize ?? 20;

    const { items, total } = await auditRepository.list(tenantId, parsedQuery);

    return {
      items,
      total,
      page,
      pageSize,
    };
  },
};

