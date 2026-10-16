export * from './financing.constants';
export * from './financing.model';
export * from './financing.repository';
export * from './financing.service';
export * from './financing.controller';
export * from './financing.routes';
export * from './catalog/offers';
export * from './engine';

import { financingService } from './financing.service';
import { financingRepository } from './financing.repository';

export const getOfferByCode = financingService.getOfferByCode.bind(financingService);
export const seedFinancingOffers = financingRepository.seedFinancingOffers.bind(financingRepository);
