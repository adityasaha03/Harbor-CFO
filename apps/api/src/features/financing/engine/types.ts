import type {
  FinancingOffer,
  FinancingPurpose,
  FinancingSchedule,
  EligibilityReason,
  EligibilityStatus,
  FinancingImpact,
  FinancingScoringBreakdown,
  RankedFinancingOffer,
} from '@harbor/contracts';

export interface TenantCreditProfile {
  yearsInOperation?: number;
  employeeCount?: number;
  industry?: string;
  monthlyRevenueMinor?: number;
  monthlyCardSalesMinor?: number;
}

export interface EligibilityContext {
  currency: string;
  purpose: FinancingPurpose;
  desiredAmountMinor?: number;
  gapMinor: number;
  asOfDate: string;
  breachDate: string | null;
  openArMinor: number;
  hasOpenArInvoice: boolean;
  profile?: TenantCreditProfile;
}

export interface EvaluatedOffer {
  offer: FinancingOffer;
  status: EligibilityStatus;
  reasons: EligibilityReason[];
  missingFields?: string[];
  suggestedPrincipalMinor: number;
  schedule?: FinancingSchedule;
}

export type {
  FinancingOffer,
  FinancingPurpose,
  FinancingSchedule,
  EligibilityReason,
  EligibilityStatus,
  FinancingImpact,
  FinancingScoringBreakdown,
  RankedFinancingOffer,
};
