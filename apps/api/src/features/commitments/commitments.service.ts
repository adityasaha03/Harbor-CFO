import type { ClientSession } from 'mongoose';
import type {
  CommitmentDto,
  CreateCommitmentInput,
  UpdateCommitmentInput,
} from '@harbor/contracts';
import { ConflictError, NotFoundError } from '../../core/http/app-error.js';
import { commitmentsRepository } from './commitments.repository.js';
import type { CommitmentDoc } from './commitments.model.js';

function toDto(doc: CommitmentDoc): CommitmentDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    label: doc.label,
    direction: doc.direction,
    category: doc.category,
    amountMinor: doc.amountMinor,
    frequency: doc.frequency,
    anchorOn: doc.anchorOn,
    endOn: doc.endOn,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

async function syncCommitmentChange(tenantId: string, session?: ClientSession): Promise<void> {
  try {
    const { tenantsRepository } = await import('../tenants/tenants.repository.js');
    await tenantsRepository.bumpDatasetVersion(tenantId, session);
    const { forecastService } = await import('../forecast/forecast.service.js');
    await forecastService.getBaseline(tenantId, session);
    const { alertsService } = await import('../alerts/alerts.service.js');
    await alertsService.evaluateAndSync(tenantId, session);
  } catch {
    // Non-blocking
  }
}

export const commitmentsService = {
  async list(tenantId: string, session?: ClientSession): Promise<CommitmentDto[]> {
    const docs = await commitmentsRepository.list(tenantId, session);
    return docs.map(toDto);
  },

  async getById(tenantId: string, id: string, session?: ClientSession): Promise<CommitmentDto | null> {
    const doc = await commitmentsRepository.findById(tenantId, id, session);
    return doc ? toDto(doc) : null;
  },

  async create(
    tenantId: string,
    data: CreateCommitmentInput,
    session?: ClientSession,
  ): Promise<CommitmentDto> {
    const existing = await commitmentsRepository.findByLabel(tenantId, data.label, session);
    if (existing) {
      throw new ConflictError(`Commitment with label '${data.label}' already exists`);
    }

    const doc = await commitmentsRepository.create(tenantId, data, session);
    await syncCommitmentChange(tenantId, session);
    return toDto(doc);
  },

  async update(
    tenantId: string,
    id: string,
    patch: UpdateCommitmentInput,
    session?: ClientSession,
  ): Promise<CommitmentDto> {
    if (patch.label) {
      const existing = await commitmentsRepository.findByLabel(tenantId, patch.label, session);
      const existingId = existing ? String(existing.id ?? (existing as { _id?: unknown })._id) : null;
      if (existing && existingId !== id) {
        throw new ConflictError(`Commitment with label '${patch.label}' already exists`);
      }
    }

    const doc = await commitmentsRepository.update(tenantId, id, patch, session);
    if (!doc) {
      throw new NotFoundError(`Commitment with id '${id}' not found`);
    }
    await syncCommitmentChange(tenantId, session);
    return toDto(doc);
  },

  async delete(tenantId: string, id: string, session?: ClientSession): Promise<void> {
    const deleted = await commitmentsRepository.delete(tenantId, id, session);
    if (!deleted) {
      throw new NotFoundError(`Commitment with id '${id}' not found`);
    }
    await syncCommitmentChange(tenantId, session);
  },
};

