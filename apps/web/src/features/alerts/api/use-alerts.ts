'use client';

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/query/keys';
import type { Alert } from '@harbor/contracts';

export const ANCHOR_ALERTS_MOCK: Alert[] = [
  {
    id: 'alt_critical_gap',
    ruleId: 'floor_breach',
    severity: 'critical',
    status: 'open',
    title: 'Severe cash floor breach projected on Day 21',
    summary:
      'Cash balance drops below the CNY 30,000 policy floor on 29 Oct and reaches -CNY 20,000 on 10 Nov. Gap to restore floor is CNY 50,000.',
    evidence: [
      {
        type: 'forecast',
        id: 'fc_breach_d21',
        label: 'Projected negative closing balance on 2026-11-10',
        amountMinor: -2000000,
      },
    ],
    firstSeenAt: '2026-10-20T08:35:00Z',
    lastSeenAt: '2026-10-20T08:35:00Z',
  },
  {
    id: 'alt_overdue_apex',
    ruleId: 'overdue_receivable',
    severity: 'high',
    status: 'open',
    title: 'CNY 40,000.00 receivable past due from Apex Distribution Ltd',
    summary:
      'Invoice INV-2026-088 is currently overdue. Expected settlement moved out to day 24.',
    evidence: [
      {
        type: 'invoice',
        id: 'INV-2026-088',
        label: 'Apex Distribution invoice',
        amountMinor: 4000000,
      },
    ],
    firstSeenAt: '2026-10-20T08:35:00Z',
    lastSeenAt: '2026-10-20T08:35:00Z',
  },
  {
    id: 'alt_concentration_apex',
    ruleId: 'customer_concentration',
    severity: 'medium',
    status: 'open',
    title: 'Customer concentration exceeds risk tolerance',
    summary:
      'Apex Distribution Ltd represents 66.7% of total receivables (policy ceiling: 40.0%).',
    evidence: [
      {
        type: 'counterparty',
        id: 'CUST-APEX',
        label: 'Apex Distribution concentration',
      },
    ],
    firstSeenAt: '2026-10-20T08:35:00Z',
    lastSeenAt: '2026-10-20T08:35:00Z',
  },
];

export function useAlerts(): UseQueryResult<Alert[], Error> {
  return useQuery<Alert[], Error>({
    queryKey: queryKeys.alerts.list(),
    queryFn: async () => {
      try {
        return await apiFetch<Alert[]>('/alerts');
      } catch {
        // Fallback stub while backend B10 is in development
        return ANCHOR_ALERTS_MOCK;
      }
    },
  });
}
