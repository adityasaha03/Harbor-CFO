import mongoose, { type Model } from 'mongoose';
import type {
  AlertEvidenceItem,
  AlertRule,
  AlertSeverity,
  AlertStatus,
} from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface AlertDoc {
  id?: string;
  tenantId: string;
  ruleId: AlertRule;
  fingerprint: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  summary: string;
  evidence: AlertEvidenceItem[];
  inputVersion?: number;
  firstSeenAt: Date;
  lastSeenAt: Date;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const alertEvidenceSchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    id: { type: String, required: true },
    label: { type: String, required: true },
    amountMinor: { type: Number, required: false },
  },
  { _id: false },
);

const alertSchema = createSchema<AlertDoc>({
  tenantId: { type: String, required: true },
  ruleId: {
    type: String,
    required: true,
    enum: [
      'negative_cash',
      'floor_breach',
      'overdue_receivable',
      'customer_concentration',
      'repayment_pressure',
      'stale_data',
    ],
  },
  fingerprint: { type: String, required: true },
  severity: {
    type: String,
    required: true,
    enum: ['critical', 'high', 'medium', 'info'],
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'resolved'],
    default: 'open',
  },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  evidence: { type: [alertEvidenceSchema], default: [] },
  inputVersion: { type: Number, required: false },
  firstSeenAt: { type: Date, required: true, default: Date.now },
  lastSeenAt: { type: Date, required: true, default: Date.now },
  resolvedAt: { type: Date, default: null },
});

alertSchema.index({ tenantId: 1, fingerprint: 1 }, { unique: true });
alertSchema.index({ tenantId: 1, status: 1, severity: 1 });

export const AlertModel: Model<AlertDoc> =
  (mongoose.models.Alert as Model<AlertDoc>) ||
  mongoose.model<AlertDoc>('Alert', alertSchema, 'alerts');
