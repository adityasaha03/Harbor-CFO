import type {
  AlertEvidenceItem,
  AlertRule,
  AlertSeverity,
  ForecastPoint,
} from '@harbor/contracts';

export interface CandidateAlert {
  ruleId: AlertRule;
  fingerprint: string;
  severity: AlertSeverity;
  title: string;
  summary: string;
  evidence: AlertEvidenceItem[];
}

export interface AlertInvoiceItem {
  id: string;
  invoiceNumber?: string;
  direction: 'AR' | 'AP';
  counterpartyExternalId: string;
  counterpartyName?: string;
  totalMinor: number;
  outstandingMinor: number;
  dueOn: string;
  status: string;
}

export interface AlertForecastSummary {
  firstNegativeDate: string | null;
  firstBelowFloorDate: string | null;
  liquidityGapMinor: number;
  minCashMinor?: number;
  points?: ForecastPoint[];
}

export interface AlertEvaluationContext {
  tenantId: string;
  asOfDate: string;
  settings: {
    minimumCashMinor: number;
    overdueAlertDays: number;
    concentrationThresholdPct: number;
    staleDataDays: number;
  };
  forecastSummary: AlertForecastSummary | null;
  invoices: AlertInvoiceItem[];
  lastCommittedImportAt: Date | string | null;
}
