export const PROPOSAL_EXPIRY_MINUTES = 30;
export const APPROVAL_EXPIRY_MINUTES = 5;

export const ACTION_TYPE_SANDBOX_FINANCING_DRAW = "sandbox_financing_draw" as const;

export const AUDIT_ACTIONS = {
  PROPOSAL_CREATE: "proposal.create",
  FINANCING_APPROVE: "financing.approve",
  FINANCING_REJECT: "financing.reject",
  FINANCING_EXECUTE: "financing.execute",
} as const;

export const AUDIT_REASONS = {
  SUCCESS: "SUCCESS",
  NOT_APPROVER: "NOT_APPROVER",
  STALE_VERSION: "STALE_VERSION",
  EXPIRED: "EXPIRED",
  HASH_MISMATCH: "HASH_MISMATCH",
  APPROVAL_CONSUMED: "APPROVAL_CONSUMED",
  ROLE_REVOKED: "ROLE_REVOKED",
} as const;

export const EVENT_KINDS = {
  PROPOSAL_CREATED: "proposal.created",
  APPROVAL_REQUIRED: "approval.required",
  ACTION_COMMITTED: "action.committed",
} as const;
