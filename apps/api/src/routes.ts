import { Router } from 'express';
import { createRateLimiter } from './core/security/rate-limit';
import { authRouter } from './features/auth';
import { auditRouter } from './features/audit';
import { eventsRouter } from './features/events';
import { tenantSettingsRouter } from './features/tenants';
import { accountsRouter } from './features/accounts';
import { ledgerEntriesRouter } from './features/ledger';
import { invoicesRouter } from './features/invoices';
import { commitmentsRouter } from './features/commitments';
import { importsRouter } from './features/imports';
import { forecastsRouter } from './features/forecast';
import { alertsRouter } from './features/alerts';
import { analyticsRouter } from './features/analytics';
import { financingRouter } from './features/financing';
import { scenariosRouter } from './features/scenarios';
import { actionsRouter } from './features/actions';
import { agentRouter } from './features/agent';

import { demoRouter } from './features/demo';
import { evidenceRouter, proofRouter } from './features/evidence';

export function createApiRouter(): Router {
  const router = Router();

  // Apply default rate limiting to all /api/v1 endpoints (120 requests/minute per user/IP)
  router.use(createRateLimiter());

  // Mount feature routers under /api/v1 (one line per feature):
  router.use('/me', authRouter); // B03: Auth middleware & me endpoint
  router.use('/tenant-settings', tenantSettingsRouter); // B05: Tenant data features
  router.use('/accounts', accountsRouter); // B05: Tenant data features
  router.use('/ledger-entries', ledgerEntriesRouter); // B05: Tenant data features
  router.use('/invoices', invoicesRouter); // B05: Tenant data features
  router.use('/commitments', commitmentsRouter); // B05: Tenant data features
  router.use('/imports', importsRouter); // B07: Import endpoints
  router.use('/forecasts', forecastsRouter); // B09: Forecast service & endpoints
  router.use('/alerts', alertsRouter); // B10: Alerts endpoints
  router.use('/analytics', analyticsRouter); // B11: Analytics summary
  router.use('/financing', financingRouter); // B12: Financing catalog & matching
  router.use('/scenarios', scenariosRouter); // B13: Scenarios compare
  router.use('/action-proposals', actionsRouter); // B14: Action approval & execution
  router.use('/agent', agentRouter); // B16: Agent runtime & runs
  router.use('/events', eventsRouter); // B04: Event stream & replay
  router.use('/audit-events', auditRouter); // B04: Audit log endpoints
  router.use('/evidence', evidenceRouter); // B17: Evidence export
  router.use('/proof', proofRouter); // B17: Proof endpoints
  router.use('/demo', demoRouter); // B17: Demo reset

  return router;
}
