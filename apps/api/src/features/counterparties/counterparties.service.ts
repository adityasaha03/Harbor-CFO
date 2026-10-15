import type { ClientSession } from 'mongoose';
import type { CounterpartyDto, CounterpartyType } from '@harbor/contracts';
import { counterpartiesRepository, type UpsertCounterpartyData } from './counterparties.repository';

export const counterpartiesService = {
  async list(tenantId: string, session?: ClientSession): Promise<CounterpartyDto[]> {
    return counterpartiesRepository.list(tenantId, session);
  },

  async getByExternalId(
    tenantId: string,
    externalId: string,
    session?: ClientSession,
  ): Promise<CounterpartyDto | null> {
    return counterpartiesRepository.findByExternalId(tenantId, externalId, session);
  },

  async bulkUpsert(
    tenantId: string,
    items: UpsertCounterpartyData[],
    session?: ClientSession,
  ): Promise<void> {
    return counterpartiesRepository.bulkUpsert(tenantId, items, session);
  },

  async ensureCounterparty(
    tenantId: string,
    externalId: string,
    type: CounterpartyType,
    maskedName?: string,
    session?: ClientSession,
  ): Promise<CounterpartyDto> {
    return counterpartiesRepository.ensureCounterparty(tenantId, externalId, type, maskedName, session);
  },
};

