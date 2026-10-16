import {
  generateReportInputSchema,
  generateReportOutputSchema,
  type GenerateReportInput,
  type GenerateReportOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";

export const generateReportTool: Tool<
  GenerateReportInput,
  GenerateReportOutput
> = {
  name: "generateReport",
  description:
    "Generates an on-demand monthly cash summary report (CSV or PDF). Returns download path; never returns raw binary or formula file contents.",
  permission: "finance:read",
  costClass: "medium",
  inputSchema: generateReportInputSchema,
  outputSchema: generateReportOutputSchema,
  async execute(_actor, args) {
    const format = args.format ?? "csv";
    const downloadPath = `/api/v1/reports/cash-summary?month=${args.month}&format=${format}`;

    return {
      reportType: "cash_summary",
      month: args.month,
      format,
      downloadPath,
      summary: `Generated ${format.toUpperCase()} cash summary report for ${args.month}. Available for authenticated download at ${downloadPath}.`,
      generatedAt: new Date().toISOString(),
    };
  },
};
