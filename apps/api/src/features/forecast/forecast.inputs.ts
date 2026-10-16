import type { ClientSession } from 'mongoose';
import {
  type ForecastInput,
  type ForecastInvoice,
  type ForecastCommitment,
  type ForecastScheduledLedger,
  type TenantSettingsDto,
} from '@harbor/contracts';
import { addDays } from '@harbor/contracts/common/dates';
import { tenantsRepository } from '../tenants';
import { ledgerService } from '../ledger';
import { invoicesRepository } from '../invoices';
import { commitmentsRepository } from '../commitments';
import { FORECAST_HORIZON_DAYS } from './forecast.constants';
import { getContributedFinancing } from './forecast.sources';

export function getTodayDateOnly(timezone = 'Asia/Shanghai'): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

export interface LoadedForecastData {
  input: ForecastInput;
  datasetVersion: number;
  tenantSettings: TenantSettingsDto;
}

/**
 * Gathers a tenant's live financial data and formats it into ForecastInput.
 */
export async function loadForecastInput(
  tenantId: string,
  session?: ClientSession,
): Promise<LoadedForecastData> {
  // 1. Settings & asOfDate
  let settings = await tenantsRepository.findByTenantId(tenantId, session);
  if (!settings) {
    settings = await tenantsRepository.upsertDefaults(tenantId, session);
  }

  const asOfDate =
    settings.forecastAsOfDate ||
    getTodayDateOnly(settings.businessTimezone || 'Asia/Shanghai');
  const floorMinor = settings.minimumCashMinor;
  const horizonDays = FORECAST_HORIZON_DAYS;

  // 2. Opening Cash as of asOfDate
  const openingCashMinor = await ledgerService.getCashAt(
    tenantId,
    asOfDate,
    session,
  );

  // 3. Outstanding Invoices
  const rawInvoices = await invoicesRepository.listOutstanding(tenantId, session);
  const invoices: ForecastInvoice[] = rawInvoices.map((inv) => ({
    externalId: inv.externalId,
    direction: inv.direction,
    outstandingMinor: inv.outstandingMinor,
    dueOn: inv.dueOn,
    expectedSettlementOn: inv.expectedSettlementOn,
    counterpartyExternalId: inv.counterpartyExternalId,
  }));

  // 4. Commitments
  const rawCommitments = await commitmentsRepository.list(tenantId, session);
  const commitments: ForecastCommitment[] = rawCommitments.map((c) => ({
    id: String(c.id ?? (c as { _id?: unknown })._id),
    label: c.label,
    direction: c.direction,
    amountMinor: c.amountMinor,
    frequency: c.frequency,
    anchorOn: c.anchorOn,
    endOn: c.endOn,
  }));

  // 5. Future-dated ledger entries (bookedOn > asOfDate)
  const scheduledLedger: ForecastScheduledLedger[] = [];
  let page = 1;
  let totalEntries = 0;

  do {
    const res = await ledgerService.list(
      tenantId,
      {
        from: addDays(asOfDate, 1),
        page,
        pageSize: 100,
      },
      session,
    );

    for (const item of res.items) {
      scheduledLedger.push({
        id: item.id,
        label: item.description || item.externalId,
        on: item.bookedOn,
        amountMinor: item.amountMinor,
      });
    }

    totalEntries = res.total;
    page += 1;
  } while (scheduledLedger.length < totalEntries);

  // 6. Registered Contributor Financing Obligations
  const financing = await getContributedFinancing(tenantId, asOfDate);

  const input: ForecastInput = {
    asOfDate,
    openingCashMinor,
    floorMinor,
    horizonDays,
    invoices,
    commitments,
    financing,
    scheduledLedger,
  };

  return {
    input,
    datasetVersion: settings.datasetVersion,
    tenantSettings: settings,
  };
}
