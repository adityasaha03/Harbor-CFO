import mongoose, { type Model, type Types } from 'mongoose';
import type { ScenarioChange, ScenarioComparison } from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface ScenarioDoc {
  id?: string;
  tenantId: string;
  name: string;
  baseInputVersion: number;
  changes: ScenarioChange[];
  scenarioHash: string;
  forecastRunId?: Types.ObjectId | string | null;
  comparison: ScenarioComparison;
  createdBy: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const scenarioSchema = createSchema<ScenarioDoc>({
  tenantId: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  baseInputVersion: { type: Number, required: true },
  changes: [{ type: mongoose.Schema.Types.Mixed }],
  scenarioHash: { type: String, required: true },
  forecastRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'ForecastRun', default: null },
  comparison: { type: mongoose.Schema.Types.Mixed, required: true },
  createdBy: { type: String, required: true },
  expiresAt: { type: Date, required: true },
} as unknown as mongoose.SchemaDefinition<ScenarioDoc>);

scenarioSchema.index({ tenantId: 1, createdAt: -1 });
scenarioSchema.index({ tenantId: 1, scenarioHash: 1 });

export const ScenarioModel: Model<ScenarioDoc> =
  mongoose.models.Scenario || mongoose.model<ScenarioDoc>('Scenario', scenarioSchema);
