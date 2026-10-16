import {
  draftCollectionMessageInputSchema,
  draftCollectionMessageOutputSchema,
  formatMinor,
  diffDays,
  type DraftCollectionMessageInput,
  type DraftCollectionMessageOutput,
} from "@harbor/contracts";
import type { Tool } from "./tool.types";
import { invoicesRepository } from "../../invoices";
import { counterpartiesRepository } from "../../counterparties";
import { tenantsRepository } from "../../tenants";
import { maskName } from "./sanitize";
import { NotFoundError, ValidationError } from "../../../core/http/app-error";

export const draftCollectionMessageTool: Tool<
  DraftCollectionMessageInput,
  DraftCollectionMessageOutput
> = {
  name: "draftCollectionMessage",
  description:
    "Generates a polite payment reminder draft for an overdue accounts receivable invoice. Draft only; does not send.",
  permission: "finance:read",
  costClass: "low",
  inputSchema: draftCollectionMessageInputSchema,
  outputSchema: draftCollectionMessageOutputSchema,
  async execute(actor, args) {
    const tenantId = actor.tenantId;
    const settings = await tenantsRepository.findByTenantId(tenantId);
    const asOf = settings?.forecastAsOfDate || "2026-10-20";

    const invoice = await invoicesRepository.findByExternalId(
      tenantId,
      args.invoiceExternalId,
    );

    if (!invoice) {
      throw new NotFoundError(
        `Invoice with ID '${args.invoiceExternalId}' not found`,
      );
    }

    if (invoice.direction !== "AR") {
      throw new ValidationError(
        `Invoice '${args.invoiceExternalId}' is an AP payable, not a receivable. Collection messages apply to AR only.`,
      );
    }

    const counterparty = await counterpartiesRepository.findByExternalId(
      tenantId,
      invoice.counterpartyExternalId,
    );

    const counterpartyMaskedName =
      counterparty?.maskedName ??
      maskName(counterparty?.name || invoice.counterpartyExternalId);

    const daysOverdue = Math.max(diffDays(asOf, invoice.dueOn), 0);
    const amountFormatted = formatMinor(invoice.outstandingMinor);

    const draftText =
      `[DRAFT — FOR INTERNAL REVIEW ONLY — NOTHING IS SENT]\n\n` +
      `Dear Accounts Payable Team at ${counterpartyMaskedName},\n\n` +
      `We are writing to follow up on outstanding Invoice ${invoice.externalId} for ${amountFormatted}, ` +
      `which was due on ${invoice.dueOn} (${daysOverdue} days overdue).\n\n` +
      `Please let us know if payment has been scheduled, or reply with the remittance advice ` +
      `at your earliest convenience. If payment has already been sent, please disregard this notice.\n\n` +
      `Thank you for your ongoing partnership.\n`;

    return {
      invoiceExternalId: invoice.externalId,
      counterpartyMaskedName,
      amountMinor: invoice.outstandingMinor,
      amountFormatted,
      dueOn: invoice.dueOn,
      daysOverdue,
      draftText,
      label: "draft, nothing is sent",
      isDraft: true,
      evidenceRefs: [
        `invoice:${invoice.externalId}`,
        `counterparty:${invoice.counterpartyExternalId}`,
      ],
    };
  },
};
