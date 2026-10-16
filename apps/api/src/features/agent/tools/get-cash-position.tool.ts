import {
  getCashPositionInputSchema,
  getCashPositionOutputSchema,
  formatMinor,
  type GetCashPositionInput,
  type GetCashPositionOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { tenantsRepository } from "../../tenants";
import { accountsRepository } from "../../accounts";
import { ledgerService } from "../../ledger";

export const getCashPositionTool: Tool<
  GetCashPositionInput,
  GetCashPositionOutput
> = {
  name: "getCashPosition",
  description:
    "Get current verified cash balance across operating accounts as of the anchor business date",
  permission: "finance:read",
  costClass: "low",
  inputSchema: getCashPositionInputSchema,
  outputSchema: getCashPositionOutputSchema,
  async execute(actor) {
    const tenantId = actor.tenantId;
    const settings = await tenantsRepository.findByTenantId(tenantId);
    const asOf = settings?.forecastAsOfDate || "2026-10-20";

    const accounts = await accountsRepository.list(tenantId);
    const totalCashMinor = await ledgerService.getCashAt(tenantId, asOf);

    const accountItems = accounts.map((acc) => ({
      code: acc.code,
      maskedName: acc.name,
      balanceMinor: acc.openingBalanceMinor,
      balanceFormatted: formatMinor(acc.openingBalanceMinor),
    }));

    const evidenceRefs = accountItems
      .map((a) => `account:${a.code}`)
      .concat([`cash:${asOf}`]);

    return {
      asOf,
      totalCashMinor,
      totalCashFormatted: formatMinor(totalCashMinor),
      accounts: accountItems,
      evidenceRefs,
    };
  },
};
