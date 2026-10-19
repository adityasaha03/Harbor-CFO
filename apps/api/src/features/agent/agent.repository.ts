import { Types, type ClientSession } from 'mongoose';
import type { AgentRunDto, AgentToolName } from '@harbor/contracts';
import { AgentRunModel, type AgentRunDoc } from './agent.model';

function toRunDto(doc: AgentRunDoc): AgentRunDto {
  return {
    id: String(doc.id ?? (doc as { _id?: unknown })._id),
    tenantId: doc.tenantId,
    actorId: doc.actorId,
    mode: doc.mode,
    prompt: doc.prompt,
    status: doc.status,
    toolCalls: doc.toolCalls.map((tc) => ({
      name: tc.name as AgentToolName,
      argsSanitized: tc.argsSanitized,
      status: tc.status,
      durationMs: tc.durationMs,
      resultRefs: tc.resultRefs,
    })),
    finalAnswer: doc.finalAnswer ?? undefined,
    evidenceRefs: doc.evidenceRefs ?? [],
    proposalIds: doc.proposalIds ?? [],
    tokenUsage: doc.tokenUsage
      ? {
          input: doc.tokenUsage.input,
          output: doc.tokenUsage.output,
        }
      : undefined,
    fallbackUsed: doc.fallbackUsed,
    traceId: doc.traceId,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : String(doc.createdAt),
    completedAt: doc.completedAt
      ? doc.completedAt instanceof Date
        ? doc.completedAt.toISOString()
        : String(doc.completedAt)
      : undefined,
  };
}

export const agentRepository = {
  async createRun(
    tenantId: string,
    data: Omit<AgentRunDoc, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
    session?: ClientSession,
  ): Promise<AgentRunDto> {
    const created = await AgentRunModel.create(
      [
        {
          ...data,
          tenantId,
        },
      ],
      { session },
    );
    const doc = created[0]!;
    return toRunDto(doc.toObject());
  },

  async countRunningRuns(tenantId: string): Promise<number> {
    // Automatically transition stale runs older than 2 minutes to 'timeout'
    // so previous interrupted runs never block new user prompts.
    const twoMinutesAgo = new Date(Date.now() - 120_000);
    await AgentRunModel.updateMany(
      {
        tenantId,
        status: 'running',
        createdAt: { $lt: twoMinutesAgo },
      },
      {
        $set: {
          status: 'timeout',
          finalAnswer: 'The reasoning request timed out. Please ask your question again.',
          completedAt: new Date(),
        },
      },
    );

    return AgentRunModel.countDocuments({
      tenantId,
      status: 'running',
    });
  },

  async findRunById(
    tenantId: string,
    runId: string,
    session?: ClientSession,
  ): Promise<AgentRunDto | null> {
    if (!Types.ObjectId.isValid(runId)) {
      return null;
    }
    const doc = await AgentRunModel.findOne({ tenantId, _id: runId })
      .session(session ?? null)
      .lean();
    if (!doc) return null;

    // If an older run was left in 'running' status (e.g. server reload or sluggish model),
    // cleanly mark it as timed out so the UI unblocks and displays the timeout message.
    if (
      doc.status === 'running' &&
      doc.createdAt &&
      Date.now() - new Date(doc.createdAt).getTime() > 90_000
    ) {
      await AgentRunModel.updateOne(
        { _id: doc._id },
        {
          $set: {
            status: 'timeout',
            finalAnswer:
              'The reasoning request exceeded the allowed execution window. Please try sending your question again.',
            completedAt: new Date(),
          },
        },
      );
      doc.status = 'timeout';
      doc.finalAnswer =
        'The reasoning request exceeded the allowed execution window. Please try sending your question again.';
    }

    return toRunDto(doc as unknown as AgentRunDoc);
  },

  async listRuns(
    tenantId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ runs: AgentRunDto[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const [total, docs] = await Promise.all([
      AgentRunModel.countDocuments({ tenantId }),
      AgentRunModel.find({ tenantId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean(),
    ]);

    return {
      runs: docs.map((d) => toRunDto(d as unknown as AgentRunDoc)),
      total,
    };
  },

  async updateRun(
    tenantId: string,
    runId: string,
    update: Partial<AgentRunDoc>,
    session?: ClientSession,
  ): Promise<AgentRunDto | null> {
    if (!Types.ObjectId.isValid(runId)) {
      return null;
    }
    const doc = await AgentRunModel.findOneAndUpdate(
      { tenantId, _id: runId },
      { $set: update },
      { new: true, session: session ?? null },
    ).lean();

    if (!doc) return null;
    return toRunDto(doc as unknown as AgentRunDoc);
  },
};
