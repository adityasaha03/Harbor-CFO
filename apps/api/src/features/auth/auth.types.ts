import type { Role } from '@harbor/contracts';

export interface ActorContext {
  userId: string;
  tenantId: string;
  role: Role;
  requestId: string;
}

export interface AuthIdentity {
  userId: string;
  token: string;
  expiresAt: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- required for Express Request declaration merging
  namespace Express {
    interface Request {
      auth?: AuthIdentity;
      actor?: ActorContext;
    }
  }
}
