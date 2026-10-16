import type { z } from "zod";
import type { AgentToolName, Permission, ErrorCode } from "@harbor/contracts";
import type { ActorContext } from "../../auth/auth.types";
import { AppError } from "../../../core/http/app-error";

export class DeniedError extends AppError {
  readonly statusCode = 403;
  readonly code: ErrorCode = "FORBIDDEN";
  readonly reason: string;

  constructor(reason: string, message = `Tool execution denied: ${reason}`) {
    super(message, [{ message, code: reason }]);
    this.reason = reason;
  }
}

export type CostClass = "free" | "low" | "medium" | "high" | number;

export interface ToolExecutionContext {
  traceId?: string;
  budget?: {
    remaining: number;
    consume?: (amount: number) => void;
  };
  budgetRemaining?: number;
  consumeBudget?: (amount: number) => void;
}

export interface Tool<TInput = unknown, TOutput = unknown> {
  name: AgentToolName;
  description: string;
  permission: Permission;
  costClass: CostClass;
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  execute: (
    actor: ActorContext,
    args: TInput,
    options?: ToolExecutionContext,
  ) => Promise<TOutput>;
}

export interface ToolCall {
  name: string;
  args?: Record<string, unknown>;
}

export interface ToolResult {
  name: AgentToolName;
  data: unknown;
  durationMs: number;
  evidenceRefs: string[];
}

export interface ModelFacingToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}
