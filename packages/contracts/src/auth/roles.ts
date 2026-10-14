import { z } from 'zod';

export const ROLES = ['owner', 'employee', 'reviewer'] as const;

export type Role = (typeof ROLES)[number];

export const roleSchema = z.enum(ROLES);
