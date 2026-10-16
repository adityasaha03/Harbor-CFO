import {
  listOverdueInvoicesInputSchema,
  listOverdueInvoicesOutputSchema,
  formatMinor,
  diffDays,
  type ListOverdueInvoicesInput,
  type ListOverdueInvoicesOutput,
  type OverdueInvoiceItem,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { invoicesRepository } from "../../invoices";
import { counterpartiesRepository } from "../../counterparties";
import { tenantsRepository } from "../../tenants";
import { truncateUntrustedText } from "./sanitize";

export const listOverdueInvoicesTool: Tool<
  ListOverdueInvoicesInput,
  ListOverdueInvoicesOutput
> = {
  name: "listOverdueInvoices",
  description:
    "List overdue accounts receivable invoices with days overdue and payment details",
  permission: "finance:read",
  costClass: "low",
  inputSchema: listOverdueInvoicesInputSchema,
  outputSchema: listOverdueInvoicesOutputSchema,
  async execute(actor, args) {
    const tenantId = actor.tenantId;
    const settings = await tenantsRepository.findByTenantId(tenantId);
    const asOf = settings?.forecastAsOfDate || "2026-10-20";
    const minDays = args.minDays ?? 1;

    const outstanding = await invoicesRepository.listOutstanding(tenantId);
    const arInvoices = outstanding.filter(
      (inv) => inv.direction === "AR" && inv.dueOn < asOf,
    );

    const items: OverdueInvoiceItem[] = [];
    let totalOverdueMinor = 0;

    for (const inv of arInvoices) {
      const daysOverdue = diffDays(asOf, inv.dueOn);
      if (daysOverdue >= minDays) {
        totalOverdueMinor += inv.outstandingMinor;
        const counterparty = await counterpartiesRepository.findByExternalId(
          tenantId,
          inv.counterpartyExternalId,
        );
        const counterpartyMaskedName =
          counterparty?.maskedName ?? `Customer ${inv.counterpartyExternalId}`;

        const untrustedText = truncateUntrustedText(inv.description, 200);

        items.push({
          externalId: inv.externalId,
          counterpartyMaskedName,
          outstandingMinor: inv.outstandingMinor,
          outstandingFormatted: formatMinor(inv.outstandingMinor),
          dueOn: inv.dueOn,
          daysOverdue,
          ...(untrustedText ? { untrustedText } : {}),
        });
      }
    }

    items.sort((a, b) => b.daysOverdue - a.daysOverdue);

    return {
      invoices: items,
      count: items.length,
      totalOverdueMinor,
      totalOverdueFormatted: formatMinor(totalOverdueMinor),
      evidenceRefs: items.map((inv) => `invoice:${inv.externalId}`),
    };
  },
};
