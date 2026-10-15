import type { ClientSession } from 'mongoose';
import {
  ledgerQuerySchema,
  type LedgerEntryDto,
  type LedgerQuery,
} from '@harbor/contracts';
import { accountsService } from '../accounts';
import { ledgerRepository, type UpsertLedgerEntryData } from './ledger.repository';

export interface LedgerListResult {
  items: LedgerEntryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export const ledgerService = {
  async list(
    tenantId: string,
    query: LedgerQuery = {},
    session?: ClientSession,
  ): Promise<LedgerListResult> {
    const parsed = ledgerQuerySchema.parse(query);
    const page = parsed.page ?? 1;
    const pageSize = parsed.pageSize ?? 20;

    const { items, total } = await ledgerRepository.list(tenantId, parsed, session);

    return {
      items,
      total,
      page,
      pageSize,
    };
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertLedgerEntryData[],
    session?: ClientSession,
  ): Promise<void> {
    return ledgerRepository.bulkUpsert(tenantId, items, session);
  },

  /**
   * Computes the cash balance for a tenant as of a specific business date.
   * Specification invariant:
   * Cash = sum of opening balances + ledger entries booked after openingBalanceDate up to asOf.
   * Entries on or before openingBalanceDate are ignored for the cash balance calculation.
   */
  async getCashAt(
    tenantId: string,
    asOf: string,
    session?: ClientSession,
  ): Promise<number> {
    const accounts = await accountsService.list(tenantId, session);
    let totalCashMinor = 0;

    for (const account of accounts) {
      let accountCash = account.openingBalanceMinor;

      // Only add entries strictly after the opening balance date up to the as-of date
      if (asOf > account.openingBalanceDate) {
        const entries = await ledgerRepository.findEntriesForCashCalculation(
          tenantId,
          account.code,
          account.openingBalanceDate,
          asOf,
          session,
        );

        for (const entry of entries) {
          accountCash += entry.amountMinor;
        }
      }

      totalCashMinor += accountCash;
    }

    return totalCashMinor;
  },
};

