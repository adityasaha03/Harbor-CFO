import type { ClientSession } from 'mongoose';
import type {
  AlertDto,
  AlertStatus,
  RaiseRepaymentPressureInput,
} from '@harbor/contracts';
import { NotFoundError } from '../../core/http/app-error';
import { auditService } from '../audit/audit.service';
import { counterpartiesRepository } from '../counterparties/counterparties.repository';
import { eventsService } from '../events/events.service';
import { forecastService } from '../forecast/forecast.service';
import { importsRepository } from '../imports/imports.repository';
import { invoicesRepository } from '../invoices/invoices.repository';
import { tenantsService } from '../tenants/tenants.service';
import { ALERT_FINGERPRINTS, ALERT_RULES } from './alerts.constants';
import { alertsRepository } from './alerts.repository';
import { evaluateAlerts } from './engine/evaluate';
import type {
  AlertEvaluationContext,
  AlertInvoiceItem,
  CandidateAlert,
} from './engine/types';

export const alertsService = {
  /**
   * Evaluates all alert rules against current tenant state and synchronizes open alerts.
   * - Emits alert.raised and records audit event on new/reopened alerts
   * - Emits alert.resolved when existing conditions clear
   */
  async evaluateAndSync(
    tenantId: string,
    session?: ClientSession,
  ): Promise<{
    active: AlertDto[];
    resolved: AlertDto[];
  }> {
    const settings = await tenantsService.ensureSettings(tenantId, session);
    const asOf = await tenantsService.getForecastAsOf(tenantId);
    const forecast = await forecastService.getBaseline(tenantId, session);

    const [rawInvoices, counterparties, committedImports] = await Promise.all([
      invoicesRepository.list(tenantId, { direction: 'AR' }, session),
      counterpartiesRepository.list(tenantId, session),
      importsRepository.list(
        tenantId,
        { status: 'committed', page: 1, pageSize: 1 },
        session,
      ),
    ]);

    const counterpartyNameMap = new Map<string, string>();
    for (const cp of counterparties) {
      counterpartyNameMap.set(cp.externalId, cp.name);
    }

    const invoices: AlertInvoiceItem[] = rawInvoices.map((inv) => ({
      id: String(inv.id ?? (inv as { _id?: unknown })._id),
      invoiceNumber: inv.externalId,
      direction: inv.direction,
      counterpartyExternalId: inv.counterpartyExternalId,
      counterpartyName: counterpartyNameMap.get(inv.counterpartyExternalId),
      totalMinor: inv.totalMinor,
      outstandingMinor: inv.outstandingMinor,
      dueOn: inv.dueOn,
      status: inv.status,
    }));

    const lastCommittedImportAt =
      committedImports.items[0]?.committedAt ??
      committedImports.items[0]?.createdAt ??
      null;

    const ctx: AlertEvaluationContext = {
      tenantId,
      asOfDate: asOf,
      settings: {
        minimumCashMinor: settings.minimumCashMinor,
        overdueAlertDays: settings.overdueAlertDays,
        concentrationThresholdPct: settings.concentrationThresholdPct,
        staleDataDays: settings.staleDataDays,
      },
      forecastSummary: {
        firstNegativeDate: forecast.run.summary.firstNegativeDate,
        firstBelowFloorDate: forecast.run.summary.firstBelowFloorDate,
        liquidityGapMinor: forecast.run.summary.liquidityGapMinor,
        minCashMinor: forecast.run.summary.minCashMinor,
        points: forecast.run.points,
      },
      invoices,
      lastCommittedImportAt,
    };

    const candidates = evaluateAlerts(ctx);
    const openAlerts = await alertsRepository.findOpen(tenantId, session);
    const candidateFingerprints = new Set(candidates.map((c) => c.fingerprint));

    const active: AlertDto[] = [];
    for (const candidate of candidates) {
      const { alert, isNew } = await alertsRepository.upsertCandidate(
        tenantId,
        candidate,
        forecast.inputVersion,
        session,
      );
      active.push(alert);

      if (isNew) {
        const refs = [alert.id, ...(alert.fingerprint ? [alert.fingerprint] : [])];
        await eventsService.publish(
          tenantId,
          {
            kind: 'alert.raised',
            publicSummary: `Alert raised: ${alert.title}`,
            resourceRefs: refs,
          },
          session,
        );

        await auditService.record(
          {
            tenantId,
            actorId: 'system',
            actorRole: 'system',
            action: 'alert.raised',
            decision: 'allowed',
            reasonCode: alert.ruleId,
            resourceRefs: refs,
            traceId: `alert-${alert.fingerprint ?? alert.id}`,
          },
          session,
        );
      }
    }

    const evaluatedRules = new Set<string>([
      ALERT_RULES.NEGATIVE_CASH,
      ALERT_RULES.FLOOR_BREACH,
      ALERT_RULES.OVERDUE_RECEIVABLE,
      ALERT_RULES.CUSTOMER_CONCENTRATION,
      ALERT_RULES.STALE_DATA,
    ]);

    const fingerprintsToResolve = openAlerts
      .filter(
        (a): a is AlertDto & { fingerprint: string } =>
          typeof a.fingerprint === 'string' &&
          evaluatedRules.has(a.ruleId) &&
          !candidateFingerprints.has(a.fingerprint),
      )
      .map((a) => a.fingerprint);

    const resolved = await alertsRepository.markResolved(
      tenantId,
      fingerprintsToResolve,
      session,
    );

    for (const alert of resolved) {
      const refs = [alert.id, ...(alert.fingerprint ? [alert.fingerprint] : [])];
      await eventsService.publish(
        tenantId,
        {
          kind: 'alert.resolved',
          publicSummary: `Alert resolved: ${alert.title}`,
          resourceRefs: refs,
        },
        session,
      );
    }

    return { active, resolved };
  },

  /**
   * Directly raises or updates repayment pressure alert from financing/scenario workflows.
   */
  async raiseRepaymentPressure(
    tenantId: string,
    input: RaiseRepaymentPressureInput,
    session?: ClientSession,
  ): Promise<AlertDto> {
    const candidate: CandidateAlert = {
      ruleId: ALERT_RULES.REPAYMENT_PRESSURE,
      fingerprint: ALERT_FINGERPRINTS.repaymentPressure(input.refId),
      severity: 'high',
      title: input.title,
      summary: input.summary,
      evidence: input.evidence,
    };

    const { alert, isNew } = await alertsRepository.upsertCandidate(
      tenantId,
      candidate,
      input.inputVersion,
      session,
    );

    if (isNew) {
      const refs = [alert.id, ...(alert.fingerprint ? [alert.fingerprint] : [])];
      await eventsService.publish(
        tenantId,
        {
          kind: 'alert.raised',
          publicSummary: `Alert raised: ${alert.title}`,
          resourceRefs: refs,
        },
        session,
      );

      await auditService.record(
        {
          tenantId,
          actorId: 'system',
          actorRole: 'system',
          action: 'alert.raised',
          decision: 'allowed',
          reasonCode: alert.ruleId,
          resourceRefs: refs,
          traceId: `alert-${alert.fingerprint ?? alert.id}`,
        },
        session,
      );
    }

    return alert;
  },

  /**
   * Lists alerts for a tenant with optional status filtering.
   */
  async list(
    tenantId: string,
    filter?: { status?: AlertStatus },
    session?: ClientSession,
  ): Promise<AlertDto[]> {
    return alertsRepository.list(tenantId, filter, session);
  },

  /**
   * Retrieves single alert by id with tenant isolation check.
   */
  async getById(
    tenantId: string,
    id: string,
    session?: ClientSession,
  ): Promise<AlertDto> {
    const alert = await alertsRepository.findById(tenantId, id, session);
    if (!alert) {
      throw new NotFoundError('Alert not found');
    }
    return alert;
  },
};
