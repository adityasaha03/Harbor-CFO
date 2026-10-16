import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { DEMO_TENANTS, type ActorContext } from '@harbor/contracts';
import { connectMongo, disconnectMongo } from '../../core/db/mongo';
import { logger } from '../../core/logging/logger';
import { demoService } from '../demo/demo.service';
import { agentRepository } from '../agent/agent.repository';
import { executeAgentLoop } from '../agent/agent.loop';
import { ReplayProvider } from '../agent/providers/replay.provider';
import { proposalsService } from '../actions/proposals.service';
import { approvalsService } from '../actions/approvals.service';
import { executionService } from '../actions/execution.service';
import { ActionProposal } from '../actions/actions.models';
import { executeProofCheck } from './proof/checks';
import { evidenceService } from './evidence.service';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../../../');
const OUTPUT_DIR = path.join(REPO_ROOT, 'submissions/execution-evidence');

export async function runEvidenceExport(): Promise<{ files: string[]; manifest: Record<string, string> }> {
  logger.info('1. Seeding Harbor Wholesale and Pearl Bakery demo datasets...');
  const harborSeed = await demoService.seedTenant(DEMO_TENANTS.HARBOR_WHOLESALE);
  await demoService.seedTenant(DEMO_TENANTS.PEARL_BAKERY);
  const tenantId = harborSeed.tenantId;

  const { ownerUserId } = await demoService.resolveOrgAndOwner(DEMO_TENANTS.HARBOR_WHOLESALE);

  // Resolve employee user ID
  const memberDoc = await mongoose.connection
    .collection('member')
    .findOne({ organizationId: mongoose.Types.ObjectId.isValid(tenantId) ? new mongoose.Types.ObjectId(tenantId) : tenantId, role: 'employee' });

  const employeeUserId = memberDoc ? String(memberDoc.userId) : 'usr_employee_demo';

  const ownerActor: ActorContext = {
    userId: ownerUserId,
    tenantId,
    role: 'owner',
    requestId: `evidence-owner-${Date.now()}`,
  };

  const employeeActor: ActorContext = {
    userId: employeeUserId,
    tenantId,
    role: 'employee',
    requestId: `evidence-emp-${Date.now()}`,
  };

  logger.info('2. Running replay agent reasoning and tool usage trace...');
  const run = await agentRepository.createRun(tenantId, {
    actorId: ownerUserId,
    mode: 'replay',
    prompt: 'Check our overdue invoices and explain our cash position',
    status: 'running',
    toolCalls: [],
    evidenceRefs: [],
    proposalIds: [],
    traceId: `evidence-agent-${Date.now()}`,
  });

  const provider = new ReplayProvider();
  await executeAgentLoop({
    runId: run.id,
    actor: ownerActor,
    prompt: 'Check our overdue invoices and explain our cash position',
    provider,
  });

  logger.info('3. Creating Bridge Term Loan proposal...');
  let proposal = await ActionProposal.findOne({ tenantId, status: 'pending' });
  if (!proposal) {
    proposal = (await proposalsService.createProposal(
      ownerActor,
      {
        actionType: 'sandbox_financing_draw',
        offerCode: 'bridge-term',
        principalMinor: 6_000_000,
      },
      'user'
    )) as unknown as typeof proposal;
  }

  logger.info('4. Executing Employee denial check (asserting 403 Forbidden & unchanged state)...');
  await executeProofCheck(employeeActor, 'employee-execute');

  logger.info('5. Approving and executing proposal as Owner...');
  await approvalsService.approveProposal(ownerActor, proposal!.id, {
    payloadHash: proposal!.payloadHash,
  });

  const idempotencyKey = `evidence-idemp-${Date.now()}`;
  await executionService.executeProposal(ownerActor, proposal!.id, idempotencyKey);

  logger.info('6. Checking duplicate execution idempotency...');
  await executionService.executeProposal(ownerActor, proposal!.id, idempotencyKey);

  logger.info('7. Executing Cross-Tenant Isolation check...');
  await executeProofCheck(ownerActor, 'cross-tenant-lookup');

  logger.info('8. Executing Prompt Injection defense check...');
  await executeProofCheck(ownerActor, 'injection-import');

  logger.info({ outputDir: OUTPUT_DIR }, '9. Generating and exporting evidence bundle to disk...');
  const result = await evidenceService.exportEvidenceToFiles(tenantId, OUTPUT_DIR);

  logger.info(
    { fileCount: result.files.length, manifestFiles: Object.keys(result.manifest).length },
    'Evidence export successfully completed'
  );

  return result;
}

async function runCli(): Promise<void> {
  const isDirectRun =
    typeof process !== 'undefined' &&
    process.argv[1] &&
    process.argv[1].replace(/\\/g, '/').endsWith('features/evidence/export-evidence.ts');

  if (!isDirectRun) {
    return;
  }

  await connectMongo();
  try {
    await runEvidenceExport();
  } finally {
    await disconnectMongo();
  }
}

void runCli().catch((err: unknown) => {
  logger.fatal({ err }, 'Fatal error during evidence export');
  process.exit(1);
});
