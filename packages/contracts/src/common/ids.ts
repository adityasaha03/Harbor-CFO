import { z } from 'zod';
import { roleSchema, type Role } from '../auth/roles';

export const idSchema = z.string().min(1);

export const tenantIdSchema = z.string().min(1);

export const userIdSchema = z.string().min(1);

export const actorContextSchema = z.object({
  userId: userIdSchema,
  tenantId: tenantIdSchema,
  role: roleSchema,
  requestId: z.string().min(1),
});

export interface ActorContext {
  userId: string;
  tenantId: string;
  role: Role;
  requestId: string;
}
