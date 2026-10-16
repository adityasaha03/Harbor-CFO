import type { Request, Response } from 'express';
import type { CreateAgentRunInput, AgentRunsQuery } from '@harbor/contracts';
import { agentService } from './agent.service';

export const agentController = {
  async createRun(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    const input = req.body as CreateAgentRunInput;
    const result = await agentService.createRun(actor, input);
    res.status(202).json({ data: result });
  },

  async getRun(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    const runId = req.params.id as string;
    const run = await agentService.getRun(actor, runId);
    res.status(200).json({ data: run });
  },

  async listRuns(req: Request, res: Response): Promise<void> {
    const actor = req.actor!;
    const query = req.query as unknown as AgentRunsQuery;
    const { runs, total, page, pageSize } = await agentService.listRuns(
      actor,
      query,
    );
    res.status(200).json({
      data: runs,
      meta: { total, page, pageSize },
    });
  },
};
