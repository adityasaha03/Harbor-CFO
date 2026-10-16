export const FORECAST_ALGORITHM_VERSION = 'fc-1';
export const BASELINE_SCENARIO_HASH = 'base';
export const FORECAST_HORIZON_DAYS = 91;
export const DEFAULT_CONSERVATIVE_EXTRA_DAYS = 14;

export const BASELINE_ASSUMPTIONS = [
  'Baseline scenario assumes outstanding AR settles on expected settlement dates.',
  'Recurring commitments recur per configured frequency and amount.',
  'Conservative scenario assumes overdue AR arrives 14 days later.',
];
