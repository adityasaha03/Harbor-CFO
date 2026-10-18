import {
  type ImportDto,
  type ImportKind,
  type ImportsQuery,
  type ImportPreviewResponse,
  type NormalizedTransactionRow,
  type NormalizedInvoiceRow,
  type TransformImportInput,
  type TransformImportResponse,
} from '@harbor/contracts';
import { transformRawContentToCsv } from './imports.transform';
import { withTransaction } from '../../core/db/with-transaction';
import { NotFoundError, ConflictError, ForbiddenError } from '../../core/http/app-error';
import type { ActorContext } from '../auth/auth.types';
import { auditService } from '../audit';
import { eventsService } from '../events';
import { tenantsRepository } from '../tenants';
import { ledgerRepository } from '../ledger';
import { invoicesRepository } from '../invoices';
import { computeChecksum, validateAndMapRows } from './engine';
import {
  IMPORT_MAPPING_VERSION,
  PREVIEW_EXPIRY_MS,
  SAMPLE_ROWS_COUNT,
} from './imports.constants';
import { importsRepository } from './imports.repository';
import {
  persistCommittedTransactions,
  persistCommittedInvoices,
} from './imports.commit-handlers';
import { formatErrorsCsv } from './imports.csv-export';

export { formatErrorsCsv } from './imports.csv-export';

export const importsService = {
  async preview(
    actor: ActorContext,
    kind: ImportKind,
    file: { buffer: Buffer; originalname?: string },
  ): Promise<ImportPreviewResponse> {
    const fileName = file.originalname || 'upload.csv';
    const checksum = computeChecksum(file.buffer);
    const result = validateAndMapRows(file.buffer, kind);
    const expiresAt = new Date(Date.now() + PREVIEW_EXPIRY_MS);

    if (!result.ok) {
      const errors = result.errors.slice(0, 200);
      const record = await importsRepository.create(actor.tenantId, {
        kind,
        fileName,
        checksum,
        mappingVersion: IMPORT_MAPPING_VERSION,
        status: 'rejected',
        rowCount: 0,
        acceptedRows: 0,
        rejectedRows: errors.length,
        errors,
        actorId: actor.userId,
        expiresAt,
      });

      return {
        importId: record.id,
        kind,
        fileName,
        status: 'rejected',
        rowCount: 0,
        acceptedRows: 0,
        rejectedRows: errors.length,
        warnings: [],
        errors,
      };
    }

    const rows = result.rows;
    const record = await importsRepository.create(actor.tenantId, {
      kind,
      fileName,
      checksum,
      mappingVersion: IMPORT_MAPPING_VERSION,
      status: 'previewed',
      rowCount: result.rowCount,
      acceptedRows: rows.length,
      rejectedRows: 0,
      errors: [],
      stagedRows: rows,
      actorId: actor.userId,
      expiresAt,
    });

    return {
      importId: record.id,
      kind,
      fileName,
      status: 'previewed',
      rowCount: result.rowCount,
      acceptedRows: rows.length,
      rejectedRows: 0,
      warnings: result.warnings,
      errors: [],
      sampleRows: rows.slice(0, SAMPLE_ROWS_COUNT) as Record<string, unknown>[],
    };
  },

  async commit(actor: ActorContext, importId: string): Promise<ImportDto> {
    return withTransaction(async (session) => {
      // 1. Load import (tenant-scoped, previewed, not expired)
      const importRecord = await importsRepository.findByIdWithStaged(
        actor.tenantId,
        importId,
        session,
      );

      if (!importRecord) {
        throw new NotFoundError('Import not found');
      }

      if (importRecord.status !== 'previewed') {
        throw new ConflictError(
          `Import cannot be committed; current status is ${importRecord.status}`,
        );
      }

      if (new Date(importRecord.expiresAt).getTime() < Date.now()) {
        throw new ConflictError('Import preview has expired');
      }

      // 2. Exact re-upload check: same (tenantId, kind, checksum, mappingVersion) committed
      const existing = await importsRepository.findCommittedByChecksum(
        actor.tenantId,
        importRecord.kind,
        importRecord.checksum,
        importRecord.mappingVersion,
        session,
      );

      if (existing) {
        throw new ConflictError('This file version has already been imported', [
          { existingImportId: existing.id },
        ]);
      }

      const staged = importRecord.stagedRows ?? [];

      // 3. Persist rows into domain collections
      if (importRecord.kind === 'transactions') {
        await persistCommittedTransactions(
          actor.tenantId,
          importId,
          staged as NormalizedTransactionRow[],
          session,
        );
      } else {
        await persistCommittedInvoices(
          actor.tenantId,
          importId,
          staged as NormalizedInvoiceRow[],
          session,
        );
      }

      // 4. Mark the import committed and clear stagedRows
      const committed = await importsRepository.markCommitted(
        actor.tenantId,
        importId,
        session,
      );

      if (!committed) {
        throw new NotFoundError('Import not found');
      }

      // 5. Bump dataset version, record audit event, publish domain event
      const afterVersion = await tenantsRepository.bumpDatasetVersion(
        actor.tenantId,
        session,
      );

      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: 'import.commit',
          decision: 'allowed',
          reasonCode: 'USER_COMMIT',
          resourceRefs: [`import:${importId}`, `datasetVersion:${afterVersion}`],
          afterVersion,
          traceId: actor.requestId,
        },
        session,
      );

      await eventsService.publish(
        actor.tenantId,
        {
          kind: 'import.committed',
          publicSummary: `Imported ${committed.acceptedRows} ${committed.kind}`,
          resourceRefs: [`import:${importId}`],
        },
        session,
      );

      return committed;
    });
  },

  async getById(actor: ActorContext, importId: string): Promise<ImportDto> {
    const record = await importsRepository.findById(actor.tenantId, importId);
    if (!record) {
      throw new NotFoundError('Import not found');
    }
    return record;
  },

  async list(
    actor: ActorContext,
    query: ImportsQuery,
  ): Promise<{ items: ImportDto[]; total: number; page: number; pageSize: number }> {
    const { items, total } = await importsRepository.list(actor.tenantId, query);
    return {
      items,
      total,
      page: query.page ?? 1,
      pageSize: query.pageSize ?? 20,
    };
  },

  async getErrorsCsv(actor: ActorContext, importId: string): Promise<string> {
    const record = await importsRepository.findById(actor.tenantId, importId);
    if (!record) {
      throw new NotFoundError('Import not found');
    }
    return formatErrorsCsv(record.errors);
  },

  async transform(
    input: TransformImportInput,
  ): Promise<TransformImportResponse> {
    return transformRawContentToCsv(input);
  },

  async delete(
    actor: ActorContext,
    importId: string,
  ): Promise<{ deleted: boolean; importId: string }> {
    if (actor.role !== 'owner') {
      throw new ForbiddenError('Only workspace owners can delete imports');
    }

    return withTransaction(async (session) => {
      const record = await importsRepository.findById(actor.tenantId, importId, session);
      if (!record) {
        throw new NotFoundError('Import not found');
      }

      // 1. Delete associated domain data if this import was committed
      if (record.status === 'committed') {
        if (record.kind === 'transactions') {
          await ledgerRepository.deleteByImportId(actor.tenantId, importId, session);
        } else if (record.kind === 'invoices') {
          await invoicesRepository.deleteByImportId(actor.tenantId, importId, session);
        }
      }

      // 2. Delete the import record itself
      await importsRepository.deleteById(actor.tenantId, importId, session);

      // 3. Bump dataset version to trigger forecast cache invalidation
      const afterVersion = await tenantsRepository.bumpDatasetVersion(
        actor.tenantId,
        session,
      );

      // 4. Audit trail
      await auditService.record(
        {
          tenantId: actor.tenantId,
          actorId: actor.userId,
          actorRole: actor.role,
          action: 'import.delete',
          decision: 'allowed',
          reasonCode: 'USER_DELETE',
          resourceRefs: [`import:${importId}`, `datasetVersion:${afterVersion}`],
          afterVersion,
          traceId: actor.requestId,
        },
        session,
      );

      // 5. Publish domain event to trigger forecast baseline recomputation & SSE updates
      await eventsService.publish(
        actor.tenantId,
        {
          kind: 'import.deleted',
          publicSummary: `Deleted import ${record.fileName} (${record.kind})`,
          resourceRefs: [`import:${importId}`],
        },
        session,
      );

      return { deleted: true, importId };
    });
  },
};

