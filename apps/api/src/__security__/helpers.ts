import { issueTestToken, seedTestMember } from '../test-utils/test-auth-helper';
import { AccountModel } from '../features/accounts';
import { InvoiceModel } from '../features/invoices';
import { AlertModel } from '../features/alerts';
import { CommitmentModel } from '../features/commitments';
import { ActionProposal } from '../features/actions/actions.models';
import { AgentRunModel } from '../features/agent/agent.model';
import { tenantsRepository } from '../features/tenants';
import { seedFinancingOffers } from '../features/financing';
import { seedAnchorTenant } from '../features/scenarios/__tests__/fixtures/seed-anchor';

export interface TenantContext {
  id: string;
  owner: { id: string; token: string };
  employee: { id: string; token: string };
  reviewer: { id: string; token: string };
}

export interface SecurityTestFixtures {
  tenantA: TenantContext;
  tenantB: TenantContext;
  stranger: { id: string; token: string };
  sampleIds: {
    accountAId: string;
    invoiceAId: string;
    alertAId: string;
    commitmentAId: string;
    proposalAId: string;
    agentRunAId: string;
  };
}

export async function setupTwoTenants(): Promise<SecurityTestFixtures> {
  const tenantAId = 'tenant_sec_a';
  const tenantBId = 'tenant_sec_b';

  const userAOwner = 'usr_sec_a_owner';
  const userAEmp = 'usr_sec_a_emp';
  const userARev = 'usr_sec_a_rev';

  const userBOwner = 'usr_sec_b_owner';
  const userBEmp = 'usr_sec_b_emp';
  const userBRev = 'usr_sec_b_rev';

  const userStranger = 'usr_sec_stranger';

  // Seed memberships
  await seedTestMember(tenantAId, userAOwner, 'owner');
  await seedTestMember(tenantAId, userAEmp, 'employee');
  await seedTestMember(tenantAId, userARev, 'reviewer');

  await seedTestMember(tenantBId, userBOwner, 'owner');
  await seedTestMember(tenantBId, userBEmp, 'employee');
  await seedTestMember(tenantBId, userBRev, 'reviewer');

  // Seed tenant settings, anchor data, and financing catalog
  await seedFinancingOffers();
  await seedAnchorTenant(tenantAId);
  await tenantsRepository.upsertDefaults(tenantBId);

  // Issue short-lived tokens
  const tokenAOwner = await issueTestToken(userAOwner);
  const tokenAEmp = await issueTestToken(userAEmp);
  const tokenARev = await issueTestToken(userARev);

  const tokenBOwner = await issueTestToken(userBOwner);
  const tokenBEmp = await issueTestToken(userBEmp);
  const tokenBRev = await issueTestToken(userBRev);

  const tokenStranger = await issueTestToken(userStranger);

  // Seed Tenant A baseline resources
  const accountA = await AccountModel.create({
    tenantId: tenantAId,
    code: 'ACC-SEC-A-1',
    name: 'Operating Account A',
    currency: 'CNY',
    openingBalanceMinor: 10_000_000,
    openingBalanceDate: '2026-10-20',
  });

  const invoiceA = await InvoiceModel.create({
    tenantId: tenantAId,
    externalId: 'INV-SEC-A-1',
    direction: 'AR',
    counterpartyExternalId: 'CUST-A-1',
    totalMinor: 5_000_000,
    outstandingMinor: 5_000_000,
    currency: 'CNY',
    dueOn: '2026-11-01',
    expectedSettlementOn: '2026-11-01',
    status: 'open',
    description: 'Security test invoice',
  });

  const alertA = await AlertModel.create({
    tenantId: tenantAId,
    ruleId: 'floor_breach',
    fingerprint: 'fp_sec_a_floor',
    severity: 'high',
    status: 'open',
    title: 'Tenant A Alert',
    summary: 'Cash breach in tenant A',
    evidence: [],
    firstSeenAt: new Date(),
    lastSeenAt: new Date(),
  });

  const commitmentA = await CommitmentModel.create({
    tenantId: tenantAId,
    label: 'Payroll Commitment A',
    category: 'payroll',
    amountMinor: 2_000_000,
    direction: 'outflow',
    frequency: 'monthly',
    anchorOn: '2026-10-20',
  });

  const proposalA = await ActionProposal.create({
    tenantId: tenantAId,
    proposerId: userAOwner,
    source: 'user',
    actionType: 'sandbox_financing_draw',
    canonicalPayload: {
      actionType: 'sandbox_financing_draw',
      offerCode: 'bridge-term',
      principalMinor: 6_000_000,
      recipientAccount: 'ACC-SEC-A-1',
      terms: {
        interestBps: 650,
        feeBps: 100,
        durationDays: 30,
        upfrontFeeMinor: 60_000,
        netProceedsMinor: 5_940_000,
        repaymentAmountMinor: 6_032_500,
      },
      baselineForecastRunId: 'fc_base_1',
    },
    payloadHash: 'hash_sec_a_proposal',
    baseInputVersion: 1,
    status: 'pending',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  const agentRunA = await AgentRunModel.create({
    tenantId: tenantAId,
    actorId: userAOwner,
    mode: 'replay',
    prompt: 'Analyze cash gap for tenant A',
    status: 'completed',
    toolCalls: [],
    finalAnswer: 'Tenant A private financial analysis.',
    evidenceRefs: ['forecast:latest'],
    traceId: 'trc_sec_a_1',
    createdAt: new Date(),
  });

  return {
    tenantA: {
      id: tenantAId,
      owner: { id: userAOwner, token: tokenAOwner },
      employee: { id: userAEmp, token: tokenAEmp },
      reviewer: { id: userARev, token: tokenARev },
    },
    tenantB: {
      id: tenantBId,
      owner: { id: userBOwner, token: tokenBOwner },
      employee: { id: userBEmp, token: tokenBEmp },
      reviewer: { id: userBRev, token: tokenBRev },
    },
    stranger: { id: userStranger, token: tokenStranger },
    sampleIds: {
      accountAId: String(accountA._id),
      invoiceAId: String(invoiceA._id),
      alertAId: String(alertA._id),
      commitmentAId: String(commitmentA._id),
      proposalAId: String(proposalA._id),
      agentRunAId: String(agentRunA._id),
    },
  };
}
