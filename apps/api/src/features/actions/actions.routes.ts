import { Router } from "express";
import {
  createActionProposalInputSchema,
  approveActionProposalInputSchema,
  rejectActionProposalInputSchema,
  actionProposalIdParamSchema,
} from "@harbor/contracts";
import { protect } from "../auth";
import { validate } from "../../core/http/validate";
import { createRateLimiter } from "../../core/security/rate-limit";
import { actionsController } from "./actions.controller";

export const actionsRouter: Router = Router();

// Approvals / execution rate limiter: 10 per minute per user
const executionLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 500 : 10,
});

// POST /api/v1/action-proposals (actions:propose)
actionsRouter.post(
  "/",
  protect("actions:propose"),
  validate({ body: createActionProposalInputSchema }),
  actionsController.createProposal,
);

// GET /api/v1/action-proposals (finance:read)
actionsRouter.get("/", protect("finance:read"), actionsController.listProposals);

// GET /api/v1/action-proposals/:id (finance:read)
actionsRouter.get(
  "/:id",
  protect("finance:read"),
  validate({ params: actionProposalIdParamSchema }),
  actionsController.getProposalById,
);

// POST /api/v1/action-proposals/:id/approve (actions:approve)
actionsRouter.post(
  "/:id/approve",
  protect("actions:approve"),
  validate({
    params: actionProposalIdParamSchema,
    body: approveActionProposalInputSchema,
  }),
  actionsController.approveProposal,
);

// POST /api/v1/action-proposals/:id/reject (actions:approve)
actionsRouter.post(
  "/:id/reject",
  protect("actions:approve"),
  validate({
    params: actionProposalIdParamSchema,
    body: rejectActionProposalInputSchema,
  }),
  actionsController.rejectProposal,
);

// POST /api/v1/action-proposals/:id/execute (actions:approve, Idempotency-Key required, rate limited 10/min)
actionsRouter.post(
  "/:id/execute",
  protect("actions:approve"),
  executionLimiter,
  validate({ params: actionProposalIdParamSchema }),
  actionsController.executeProposal,
);
