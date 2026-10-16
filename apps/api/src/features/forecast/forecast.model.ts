import mongoose, { type Model } from 'mongoose';
import type {
  ForecastPoint,
  ForecastSummaryWithConservative,
} from '@harbor/contracts';
import { createSchema } from '../../core/db/base-schema';

export interface ForecastRunDoc {
  id?: string;
  tenantId: string;
  inputVersion: number;
  algorithmVersion: string;
  scenarioHash: string;
  scenarioId?: mongoose.Types.ObjectId;
  asOfDate: string;
  horizonDays: number;
  floorMinor: number;
  openingCashMinor: number;
  points: ForecastPoint[];
  summary: ForecastSummaryWithConservative;
  createdAt: Date;
  updatedAt: Date;
}

const flowSourceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['invoice', 'commitment', 'financing', 'ledger'],
    },
    id: { type: String, required: true },
    label: { type: String, required: true },
    amountMinor: { type: Number, required: true },
  },
  { _id: false },
);

const forecastPointSchema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    closingMinor: { type: Number, required: true },
    receiptsMinor: { type: Number, required: true },
    paymentsMinor: { type: Number, required: true },
    financingMinor: { type: Number, required: true },
    feesMinor: { type: Number, required: true },
    repaymentsMinor: { type: Number, required: true },
    sources: { type: [flowSourceSchema], required: true, default: [] },
  },
  { _id: false },
);

const forecastSummarySchema = new mongoose.Schema(
  {
    minCashMinor: { type: Number, required: true },
    minCashDate: { type: String, required: true },
    firstBelowFloorDate: { type: String, default: null },
    firstNegativeDate: { type: String, default: null },
    liquidityGapMinor: { type: Number, required: true },
    conservativeMinCashMinor: { type: Number, required: false },
  },
  { _id: false },
);

const forecastRunSchema = createSchema<ForecastRunDoc>({
  tenantId: { type: String, required: true },
  inputVersion: { type: Number, required: true },
  algorithmVersion: { type: String, required: true },
  scenarioHash: { type: String, required: true },
  scenarioId: { type: mongoose.Schema.Types.ObjectId, required: false },
  asOfDate: { type: String, required: true },
  horizonDays: { type: Number, required: true, default: 91 },
  floorMinor: { type: Number, required: true },
  openingCashMinor: { type: Number, required: true },
  points: { type: [forecastPointSchema], required: true },
  summary: { type: forecastSummarySchema, required: true },
});

// Cache uniqueness index: exactly one run per (tenantId, inputVersion, algorithmVersion, scenarioHash)
forecastRunSchema.index(
  { tenantId: 1, inputVersion: 1, algorithmVersion: 1, scenarioHash: 1 },
  { unique: true },
);

export const ForecastRunModel: Model<ForecastRunDoc> =
  mongoose.models.ForecastRun ||
  mongoose.model<ForecastRunDoc>('ForecastRun', forecastRunSchema, 'forecastRuns');
