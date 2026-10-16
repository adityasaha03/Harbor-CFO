import { describe, it, expect } from "vitest";
import { AGENT_TOOL_NAMES } from "@harbor/contracts";
import {
  REGISTRY,
  listRegisteredTools,
  getRegisteredTool,
  getModelFacingTools,
} from "../registry";

describe("B15 Tool Registry Tests", () => {
  it("registry exactly matches the allow-listed tool list", () => {
    const registeredNames = listRegisteredTools().map((t) => t.name).sort();
    const expectedNames = [...AGENT_TOOL_NAMES].sort();

    expect(registeredNames).toEqual(expectedNames);
    expect(registeredNames).toHaveLength(10);
  });

  it("registry is frozen and cannot be modified at runtime", () => {
    expect(Object.isFrozen(REGISTRY)).toBe(true);

    expect(() => {
      // @ts-expect-error test runtime mutation
      REGISTRY["maliciousTool"] = {} as unknown as Record<string, unknown>;
    }).toThrow();
  });

  it("there is NO tool for approving, executing, raw db, shell, fs or http access", () => {
    const forbiddenPatterns = [
      "approve",
      "execute",
      "delete",
      "drop",
      "raw",
      "sql",
      "mongo",
      "shell",
      "bash",
      "exec",
      "fs",
      "file",
      "http",
      "fetch",
      "curl",
    ];

    const registered = listRegisteredTools().map((t) => t.name.toLowerCase());

    for (const pattern of forbiddenPatterns) {
      const match = registered.find((name) => name.includes(pattern));
      expect(match).toBeUndefined();
    }

    expect(getRegisteredTool("approveActionProposal")).toBeUndefined();
    expect(getRegisteredTool("executeActionProposal")).toBeUndefined();
    expect(getRegisteredTool("rawQuery")).toBeUndefined();
  });

  it("getModelFacingTools generates valid JSON schema parameters for LLM", () => {
    const modelFacing = getModelFacingTools();
    expect(modelFacing).toHaveLength(10);

    for (const tool of modelFacing) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(tool.parameters.type).toBe("object");
      expect(tool.parameters.additionalProperties).toBe(false);
    }
  });
});
