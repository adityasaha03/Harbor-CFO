import type { ClientSession } from 'mongoose';
import { Types } from 'mongoose';
import type {
  ForecastRunDto,
  ForecastPoint,
  ForecastSummaryWithConservative,
} from '@harbor/contracts';
import { ForecastRunModel, type ForecastRunDoc } from './forecast.model';

function toDto(doc: ForecastRunDoc): ForecastRunDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    inputVersion: doc.inputVersion,
    algorithmVersion: doc.algorithmVersion,
    scenarioHash: doc.scenarioHash,
    scenarioId: doc.scenarioId ? String(doc.scenarioId) : undefined,
    asOfDate: doc.asOfDate,
    horizonDays: doc.horizonDays,
    floorMinor: doc.floorMinor,
    openingCashMinor: doc.openingCashMinor,
    points: doc.points,
    summary: {
      minCashMinor: doc.summary.minCashMinor,
      minCashDate: doc.summary.minCashDate,
      firstBelowFloorDate: doc.summary.firstBelowFloorDate ?? null,
      firstNegativeDate: doc.summary.firstNegativeDate ?? null,
      liquidityGapMinor: doc.summary.liquidityGapMinor,
      conservativeMinCashMinor: doc.summary.conservativeMinCashMinor,
    },
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export interface CreateForecastRunData {
  inputVersion: number;
  algorithmVersion: string;
  scenarioHash: string;
  scenarioId?: string;
  asOfDate: string;
  horizonDays: number;
  floorMinor: number;
  openingCashMinor: number;
  points: ForecastPoint[];
  summary: ForecastSummaryWithConservative;
}

export const forecastRepository = {
  async findByCacheKey(
    tenantId: string,
    inputVersion: number,
    algorithmVersion: string,
    scenarioHash: string,
    session?: ClientSession,
  ): Promise<ForecastRunDto | null> {
    const doc = await ForecastRunModel.findOne({
      tenantId,
      inputVersion,
      algorithmVersion,
      scenarioHash,
    })
      .session(session ?? null)
      .lean();

    return doc ? toDto(doc as unknown as ForecastRunDoc) : null;
  },

  async findById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<ForecastRunDto | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    const doc = await ForecastRunModel.findOne({
      tenantId,
      _id: new Types.ObjectId(id),
    })
      .session(session ?? null)
      .lean();

    return doc ? toDto(doc as unknown as ForecastRunDoc) : null;
  },

  async findLatestBaseline(
    tenantId: string,
    session?: ClientSession,
  ): Promise<ForecastRunDto | null> {
    const doc = await ForecastRunModel.findOne({
      tenantId,
      scenarioHash: 'base',
    })
      .sort({ inputVersion: -1, _id: -1 })
      .session(session ?? null)
      .lean();

    return doc ? toDto(doc as unknown as ForecastRunDoc) : null;
  },

  async upsertRun(
    tenantId: string,
    data: CreateForecastRunData,
    session?: ClientSession,
  ): Promise<ForecastRunDto> {
    const doc = await ForecastRunModel.findOneAndUpdate(
      {
        tenantId,
        inputVersion: data.inputVersion,
        algorithmVersion: data.algorithmVersion,
        scenarioHash: data.scenarioHash,
      },
      {
        $set: {
          scenarioId: data.scenarioId ? new Types.ObjectId(data.scenarioId) : undefined,
          asOfDate: data.asOfDate,
          horizonDays: data.horizonDays,
          floorMinor: data.floorMinor,
          openingCashMinor: data.openingCashMinor,
          points: data.points,
          summary: data.summary,
        },
        $setOnInsert: {
          tenantId,
          inputVersion: data.inputVersion,
          algorithmVersion: data.algorithmVersion,
          scenarioHash: data.scenarioHash,
        },
      },
      { upsert: true, new: true, session },
    ).lean();

    return toDto(doc as unknown as ForecastRunDoc);
  },
};
