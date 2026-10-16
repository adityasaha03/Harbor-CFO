import type { Request, RequestHandler, Response } from "express";
import type {
  CreateActionProposalInput,
  ApproveActionProposalInput,
  RejectActionProposalInput,
} from "@harbor/contracts";
import { asyncHandler } from "../../core/http/async-handler";
import { ok, created } from "../../core/http/respond";
import { ValidationError } from "../../core/http/app-error";
import { proposalsService } from "./proposals.service";
import { approvalsService } from "./approvals.service";
import { executionService } from "./execution.service";

export const actionsController: {
  createProposal: RequestHandler;
  listProposals: RequestHandler;
  getProposalById: RequestHandler;
  approveProposal: RequestHandler;
  rejectProposal: RequestHandler;
  executeProposal: RequestHandler;
} = {
  createProposal: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const input = req.body as CreateActionProposalInput;
    const result = await proposalsService.createProposal(actor, input, "user");
    created(res, result);
  }),

  listProposals: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const result = await proposalsService.listProposals(actor);
    ok(res, result);
  }),

  getProposalById: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const id = String(req.params.id);
    const result = await proposalsService.getProposalById(actor, id);
    ok(res, result);
  }),

  approveProposal: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const id = String(req.params.id);
    const input = req.body as ApproveActionProposalInput;
    const result = await approvalsService.approveProposal(actor, id, input);
    ok(res, result);
  }),

  rejectProposal: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const id = String(req.params.id);
    const input = req.body as RejectActionProposalInput;
    const result = await approvalsService.rejectProposal(actor, id, input);
    ok(res, result);
  }),

  executeProposal: asyncHandler(async (req: Request, res: Response) => {
    const actor = req.actor!;
    const id = String(req.params.id);

    // Read and enforce Idempotency-Key header
    const rawIdempotencyKey =
      req.headers["idempotency-key"] || req.headers["Idempotency-Key"];
    const idempotencyKey =
      typeof rawIdempotencyKey === "string"
        ? rawIdempotencyKey.trim()
        : Array.isArray(rawIdempotencyKey)
          ? rawIdempotencyKey[0]?.trim()
          : "";

    if (!idempotencyKey) {
      throw new ValidationError(
        "Idempotency-Key header is required for executing action proposals",
      );
    }

    const result = await executionService.executeProposal(
      actor,
      id,
      idempotencyKey,
    );
    ok(res, result);
  }),
};
