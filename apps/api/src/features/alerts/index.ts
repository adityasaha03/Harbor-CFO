export { alertsRouter } from './alerts.routes';
export { alertsService } from './alerts.service';
export { alertsRepository } from './alerts.repository';
export { AlertModel, type AlertDoc } from './alerts.model';
export { ALERT_RULES, ALERT_FINGERPRINTS } from './alerts.constants';
export {
  evaluateAlerts,
  evaluateNegativeCash,
  evaluateFloorBreach,
  evaluateOverdueReceivables,
  evaluateCustomerConcentration,
  evaluateStaleData,
  type CandidateAlert,
  type AlertEvaluationContext,
  type AlertInvoiceItem,
  type AlertForecastSummary,
} from './engine';
export {
  registerAlertsListeners,
  handleAlertsEvent,
} from './alerts.listeners';

import { registerAlertsListeners } from './alerts.listeners';

// Register domain event listener on import
registerAlertsListeners();
