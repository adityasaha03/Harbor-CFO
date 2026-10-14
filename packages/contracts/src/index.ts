// Shared contracts root export for HarborCFO

// Common primitives and schemas
export * from './common/ids';
export * from './common/money';
export * from './common/dates';
export * from './common/api';
export * from './common/pagination';

// Auth contracts and permissions matrix
export * from './auth/roles';
export * from './auth/permissions';
export * from './auth/demo-accounts';

// Feature contract stubs
export * from './tenants';
export * from './ledger';
export * from './invoices';
export * from './imports';
export * from './forecast';
export * from './alerts';
export * from './analytics';
export * from './financing';
export * from './scenarios';
export * from './actions';
export * from './agent';
export * from './events';
export * from './audit';
