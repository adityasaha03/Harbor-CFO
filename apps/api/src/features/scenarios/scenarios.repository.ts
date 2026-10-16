import { type ClientSession, Types } from 'mongoose';
import type { ScenarioDto } from '@harbor/contracts';
import { ScenarioModel, type ScenarioDoc } from './scenarios.model';

function toDto(doc: ScenarioDoc, currentDatasetVersion: number): ScenarioDto {
  const isStale = doc.baseInputVersion !== currentDatasetVersion;
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    name: doc.name,
    baseInputVersion: doc.baseInputVersion,
    changes: doc.changes,
    scenarioHash: doc.scenarioHash,
    forecastRunId: doc.forecastRunId ? String(doc.forecastRunId) : null,
    comparison: doc.comparison,
    isStale,
    createdBy: doc.createdBy,
    expiresAt: doc.expiresAt instanceof Date ? doc.expiresAt.toISOString() : String(doc.expiresAt),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const scenariosRepository = {
  /**
   * Creates and persists a new scenario document.
   */
  async create(
    tenantId: string,
    data: Omit<ScenarioDoc, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession,
  ): Promise<ScenarioDto> {
    const created = await ScenarioModel.create(
      [
        {
          ...data,
          tenantId,
        },
      ],
      { session },
    );
    const doc = created[0]!;
    return toDto(doc.toObject(), data.baseInputVersion);
  },

  /**
   * Retrieves a scenario by tenantId and document ID.
   */
  async findById(
    tenantId: string,
    id: string,
    currentDatasetVersion: number,
    session?: ClientSession,
  ): Promise<ScenarioDto | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    const doc = await ScenarioModel.findOne({ tenantId, _id: id })
      .session(session ?? null)
      .lean();
    if (!doc) {
      return null;
    }
    return toDto(doc as unknown as ScenarioDoc, currentDatasetVersion);
  },

  /**
   * Finds the most recent scenario by tenantId and scenarioHash.
   */
  async findByHash(
    tenantId: string,
    scenarioHash: string,
    currentDatasetVersion: number,
    session?: ClientSession,
  ): Promise<ScenarioDto | null> {
    const doc = await ScenarioModel.findOne({ tenantId, scenarioHash })
      .sort({ createdAt: -1 })
      .session(session ?? null)
      .lean();
    if (!doc) {
      return null;
    }
    return toDto(doc as unknown as ScenarioDoc, currentDatasetVersion);
  },

  /**
   * Lists the most recent scenarios for a tenant.
   */
  async listRecent(
    tenantId: string,
    limit: number,
    currentDatasetVersion: number,
    session?: ClientSession,
  ): Promise<ScenarioDto[]> {
    const docs = await ScenarioModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .session(session ?? null)
      .lean();

    return docs.map((doc) => toDto(doc as unknown as ScenarioDoc, currentDatasetVersion));
  },
};
