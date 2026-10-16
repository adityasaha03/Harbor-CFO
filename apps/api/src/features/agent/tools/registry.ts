import type { z } from "zod";
import type { AgentToolName } from "@harbor/contracts";
import type { Tool, ModelFacingToolDefinition } from "./tool.types";
import { getCashPositionTool } from "./get-cash-position.tool";
import { getForecastTool } from "./get-forecast.tool";
import { getKpisTool } from "./get-kpis.tool";
import { listOverdueInvoicesTool } from "./list-overdue-invoices.tool";
import { matchFinancingTool } from "./match-financing.tool";
import { simulateScenarioTool } from "./simulate-scenario.tool";
import { createActionProposalTool } from "./create-action-proposal.tool";
import { getActionStatusTool } from "./get-action-status.tool";

export const TOOLS_MAP = {
  getCashPosition: getCashPositionTool,
  getForecast: getForecastTool,
  getKpis: getKpisTool,
  listOverdueInvoices: listOverdueInvoicesTool,
  matchFinancing: matchFinancingTool,
  simulateScenario: simulateScenarioTool,
  createActionProposal: createActionProposalTool,
  getActionStatus: getActionStatusTool,
} as const;

export const REGISTRY: Readonly<
  Record<AgentToolName, Tool<unknown, unknown>>
> = Object.freeze(TOOLS_MAP as unknown as Record<AgentToolName, Tool<unknown, unknown>>);

export function getRegisteredTool(
  name: string,
): Tool<unknown, unknown> | undefined {
  return (REGISTRY as Record<string, Tool<unknown, unknown> | undefined>)[name];
}

export function listRegisteredTools(): Tool<unknown, unknown>[] {
  return Object.values(REGISTRY);
}

interface DefShape {
  typeName?: string;
  innerType?: z.ZodTypeAny;
  schema?: z.ZodTypeAny;
  type?: z.ZodTypeAny;
  values?: readonly string[];
}

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  let s: z.ZodTypeAny = schema;
  while ((s as unknown as { _def?: DefShape })._def?.innerType || (s as unknown as { _def?: DefShape })._def?.schema) {
    s = (s as unknown as { _def: DefShape })._def.innerType || (s as unknown as { _def: DefShape })._def.schema!;
  }

  const def = (s as unknown as { _def?: DefShape })._def;

  if (def?.typeName === "ZodObject") {
    const shape = (s as unknown as { shape: Record<string, z.ZodTypeAny> }).shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, propSchema] of Object.entries(shape)) {
      properties[key] = zodToJsonSchema(propSchema);
      let unwrapped: z.ZodTypeAny | undefined = propSchema;
      let isOptional = false;
      while (unwrapped) {
        const uDef: DefShape | undefined = (unwrapped as unknown as { _def?: DefShape })._def;
        if (
          uDef?.typeName === "ZodOptional" ||
          uDef?.typeName === "ZodDefault"
        ) {
          isOptional = true;
          break;
        }
        if (uDef?.innerType) unwrapped = uDef.innerType;
        else if (uDef?.schema) unwrapped = uDef.schema;
        else break;
      }
      if (!isOptional) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
      additionalProperties: false,
    };
  }

  if (def?.typeName === "ZodString") {
    return { type: "string" };
  }

  if (def?.typeName === "ZodNumber") {
    return { type: "number" };
  }

  if (def?.typeName === "ZodBoolean") {
    return { type: "boolean" };
  }

  if (def?.typeName === "ZodArray" && def.type) {
    return {
      type: "array",
      items: zodToJsonSchema(def.type),
    };
  }

  if (def?.typeName === "ZodEnum" && def.values) {
    return {
      type: "string",
      enum: def.values,
    };
  }

  return { type: "object" };
}

export function getModelFacingTools(): ModelFacingToolDefinition[] {
  return listRegisteredTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToJsonSchema(tool.inputSchema),
  }));
}
