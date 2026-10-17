import type { ClientSession } from 'mongoose';
import type { TenantSettingsDto, UpdateTenantSettingsInput } from '@harbor/contracts';
import { TenantSettingsModel, type TenantSettingsDoc } from './tenants.model';

function toDto(doc: TenantSettingsDoc): TenantSettingsDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    reportingCurrency: 'CNY',
    minimumCashMinor: doc.minimumCashMinor,
    businessTimezone: doc.businessTimezone,
    datasetVersion: doc.datasetVersion,
    forecastAsOfDate: doc.forecastAsOfDate,
    overdueAlertDays: doc.overdueAlertDays,
    concentrationThresholdPct: doc.concentrationThresholdPct,
    staleDataDays: doc.staleDataDays,
    profile: doc.profile ?? {},
    isDemo: doc.isDemo,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
  };
}

export const tenantsRepository = {
  async findByTenantId(tenantId: string, session?: ClientSession): Promise<TenantSettingsDto | null> {
    const doc = await TenantSettingsModel.findOne({ tenantId }).session(session ?? null).lean();
    return doc ? toDto(doc as unknown as TenantSettingsDoc) : null;
  },

  async upsertDefaults(tenantId: string, session?: ClientSession): Promise<TenantSettingsDto> {
    const doc = await TenantSettingsModel.findOneAndUpdate(
      { tenantId },
      {
        $setOnInsert: {
          tenantId,
          reportingCurrency: 'CNY',
          minimumCashMinor: 0,
          businessTimezone: 'Asia/Shanghai',
          datasetVersion: 1,
          overdueAlertDays: 7,
          concentrationThresholdPct: 40,
          staleDataDays: 14,
          profile: {},
          isDemo: true,
        },
      },
      { upsert: true, new: true, session },
    ).lean();

    return toDto(doc as unknown as TenantSettingsDoc);
  },

  async update(
    tenantId: string,
    patch: UpdateTenantSettingsInput,
    session?: ClientSession,
  ): Promise<TenantSettingsDto> {
    const existing = await TenantSettingsModel.findOne({ tenantId }).session(session ?? null).lean();
    const updateObj: Record<string, unknown> = { ...patch };
    if (patch.profile && existing?.profile) {
      updateObj.profile = { ...existing.profile, ...patch.profile };
    }

    const doc = await TenantSettingsModel.findOneAndUpdate(
      { tenantId },
      { $set: updateObj },
      { new: true, upsert: true, session },
    ).lean();

    return toDto(doc as unknown as TenantSettingsDoc);
  },

  async bumpDatasetVersion(tenantId: string, session?: ClientSession): Promise<number> {
    const doc = await TenantSettingsModel.findOneAndUpdate(
      { tenantId },
      { $inc: { datasetVersion: 1 } },
      { new: true, upsert: true, session },
    ).lean();

    return doc.datasetVersion;
  },
};

