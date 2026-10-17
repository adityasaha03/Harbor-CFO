import type { ClientSession } from 'mongoose';
import {
  updateTenantSettingsSchema,
  type TenantSettingsDto,
  type UpdateTenantSettingsInput,
} from '@harbor/contracts';
import { tenantsRepository } from './tenants.repository';

export const tenantsService = {
  async getSettings(tenantId: string, session?: ClientSession): Promise<TenantSettingsDto | null> {
    return tenantsRepository.findByTenantId(tenantId, session);
  },

  async ensureSettings(tenantId: string, session?: ClientSession): Promise<TenantSettingsDto> {
    const existing = await tenantsRepository.findByTenantId(tenantId, session);
    if (existing) {
      return existing;
    }
    return tenantsRepository.upsertDefaults(tenantId, session);
  },

  async updateSettings(
    tenantId: string,
    patch: UpdateTenantSettingsInput,
    session?: ClientSession,
  ): Promise<TenantSettingsDto> {
    const validated = updateTenantSettingsSchema.parse(patch);
    const updated = await tenantsRepository.update(tenantId, validated, session);
    await tenantsRepository.bumpDatasetVersion(tenantId, session);
    try {
      const { forecastService } = await import('../forecast/forecast.service');
      await forecastService.getBaseline(tenantId, session);
    } catch {
      // Non-blocking if forecast engine fails on partial data
    }
    try {
      const { alertsService } = await import('../alerts/alerts.service');
      await alertsService.evaluateAndSync(tenantId, session);
    } catch {
      // Non-blocking if alerts sync fails
    }
    return updated;
  },

  async bumpDatasetVersion(tenantId: string, session?: ClientSession): Promise<number> {
    // Ensure settings exist before bumping
    await this.ensureSettings(tenantId, session);
    return tenantsRepository.bumpDatasetVersion(tenantId, session);
  },

  async getForecastAsOf(tenantId: string): Promise<string> {
    const settings = await this.ensureSettings(tenantId);
    if (settings.forecastAsOfDate) {
      return settings.forecastAsOfDate;
    }

    // Default to today in the tenant's business timezone
    const tz = settings.businessTimezone || 'Asia/Shanghai';
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      return formatter.format(new Date());
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  },
};

