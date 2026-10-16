import { logger } from "../../../core/logging/logger";
import { randomUUID } from "node:crypto";
import { hasPermission } from "@harbor/contracts";
import type { ActorContext } from "../../auth/auth.types";
import { ValidationError, ForbiddenError } from "../../../core/http/app-error";
import { membershipRepository } from "../../auth/membership.repository";
import { auditService } from "../../audit";
import { getRegisteredTool } from "./registry";
import {
  DeniedError,
  type ToolCall,
  type ToolResult,
  type ToolExecutionContext,
  type CostClass,
} from "./tool.types";

function getCostUnits(costClass: CostClass): number {
  if (typeof costClass === "number") return costClass;
  switch (costClass) {
    case "free":
      return 0;
    case "low":
      return 1;
    case "medium":
      return 2;
    case "high":
      return 3;
    default:
      return 1;
  }
}

export async function runTool(
  actor: ActorContext,
  call: ToolCall,
  options?: ToolExecutionContext,
): Promise<ToolResult> {
  // 1. Check if tool name is registered
  const tool = getRegisteredTool(call.name);
  if (!tool) {
    throw new DeniedError(
      "UNREGISTERED_TOOL",
      `Unregistered tool name: "${call.name}"`,
    );
  }

  // 2. Reject forged actor context arguments
  const rawArgs = call.args ?? {};
  if (
    Object.prototype.hasOwnProperty.call(rawArgs, "tenantId") ||
    Object.prototype.hasOwnProperty.call(rawArgs, "userId") ||
    Object.prototype.hasOwnProperty.call(rawArgs, "role")
  ) {
    throw new DeniedError(
      "FORBIDDEN_ARGUMENT",
      "Actor context fields (tenantId, userId, role) cannot be provided in tool arguments",
    );
  }

  // 3. Strict argument validation
  const parseResult = tool.inputSchema.safeParse(rawArgs);
  if (!parseResult.success) {
    throw new ValidationError(
      `Invalid tool arguments for "${tool.name}": ${parseResult.error.message}`,
      parseResult.error.errors,
    );
  }
  const validArgs = parseResult.data;

  // 4. Re-check permission against CURRENT membership role
  let currentRole = actor.role;
  try {
    const member = await membershipRepository.findMembership(
      actor.userId,
      actor.tenantId,
    );
    if (member) {
      currentRole = member.role;
    }
  } catch {
    // Fall back to actor.role if DB lookup fails (e.g. non-DB context)
  }

  if (!hasPermission(currentRole, tool.permission)) {
    await auditService
      .record({
        tenantId: actor.tenantId,
        actorId: actor.userId,
        actorRole: currentRole,
        action: `agent.tool.${tool.name}`,
        decision: "denied",
        reasonCode: "PERMISSION_DENIED",
        resourceRefs: [],
        traceId: options?.traceId ?? randomUUID(),
      })
      .catch((err) => { logger.warn({ err }, "Failed to record audit event"); });

    throw new ForbiddenError(
      `Role "${currentRole}" lacks required permission "${tool.permission}" for tool "${tool.name}"`,
    );
  }

  // 5. Consume per-run budget
  const cost = getCostUnits(tool.costClass);

  if (options?.budgetRemaining !== undefined) {
    if (options.budgetRemaining < cost) {
      throw new DeniedError(
        "BUDGET_EXHAUSTED",
        `Per-run budget exhausted: required ${cost}, remaining ${options.budgetRemaining}`,
      );
    }
    if (options.consumeBudget) {
      options.consumeBudget(cost);
    }
  }

  if (options?.budget) {
    if (options.budget.remaining < cost) {
      throw new DeniedError(
        "BUDGET_EXHAUSTED",
        `Per-run budget exhausted: required ${cost}, remaining ${options.budget.remaining}`,
      );
    }
    options.budget.remaining -= cost;
    if (options.budget.consume) {
      options.budget.consume(cost);
    }
  }

  // 6. Execute tool
  const startTime = Date.now();
  const rawOutput = await tool.execute(actor, validArgs, options);
  const durationMs = Date.now() - startTime;

  // 7. Validate output schema
  const validatedOutput = tool.outputSchema.parse(rawOutput);
  const evidenceRefs =
    (validatedOutput as { evidenceRefs?: string[] }).evidenceRefs ?? [];

  // 8. Write audit event
  await auditService
    .record({
      tenantId: actor.tenantId,
      actorId: actor.userId,
      actorRole: currentRole,
      action: `agent.tool.${tool.name}`,
      decision: "allowed",
      reasonCode: "SUCCESS",
      resourceRefs: evidenceRefs,
      traceId: options?.traceId ?? randomUUID(),
    })
    .catch((err) => { logger.warn({ err }, "Failed to record audit event"); });

  return {
    name: tool.name,
    data: validatedOutput,
    durationMs,
    evidenceRefs,
  };
}
