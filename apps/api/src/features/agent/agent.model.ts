import mongoose, { type Model } from 'mongoose';
import { createSchema } from '../../core/db/base-schema';
import type { AgentRunStatus } from '@harbor/contracts';

export interface AgentRunToolCallDoc {
  name: string;
  argsSanitized: Record<string, unknown>;
  status: 'success' | 'error';
  durationMs: number;
  resultRefs: string[];
}

export interface AgentRunDoc {
  id?: string;
  tenantId: string;
  actorId: string;
  mode: 'live' | 'replay';
  prompt: string;
  status: AgentRunStatus;
  toolCalls: AgentRunToolCallDoc[];
  finalAnswer?: string | null;
  evidenceRefs: string[];
  proposalIds: string[];
  tokenUsage?: {
    input: number;
    output: number;
  } | null;
  fallbackUsed?: boolean;
  traceId: string;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const agentRunToolCallSchema = createSchema<AgentRunToolCallDoc>(
  {
    name: { type: String, required: true },
    argsSanitized: { type: mongoose.Schema.Types.Mixed, required: true },
    status: { type: String, required: true, enum: ['success', 'error'] },
    durationMs: { type: Number, required: true },
    resultRefs: { type: [String], default: [] },
  },
  { _id: false },
);

const agentRunSchema = createSchema<AgentRunDoc>({
  tenantId: { type: String, required: true },
  actorId: { type: String, required: true },
  mode: { type: String, required: true, enum: ['live', 'replay'] },
  prompt: { type: String, required: true, maxlength: 2000 },
  status: {
    type: String,
    required: true,
    enum: ['running', 'completed', 'failed', 'timeout'],
    default: 'running',
  },
  toolCalls: { type: [agentRunToolCallSchema], default: [] },
  finalAnswer: { type: String, default: null },
  evidenceRefs: { type: [String], default: [] },
  proposalIds: { type: [String], default: [] },
  tokenUsage: {
    type: {
      input: { type: Number, required: true },
      output: { type: Number, required: true },
    },
    default: null,
  },
  fallbackUsed: { type: Boolean, default: false },
  traceId: { type: String, required: true },
  completedAt: { type: Date, default: null },
});

agentRunSchema.index({ tenantId: 1, createdAt: -1 });

export const AgentRunModel: Model<AgentRunDoc> =
  mongoose.models.AgentRun ||
  mongoose.model<AgentRunDoc>('AgentRun', agentRunSchema, 'agentRuns');
