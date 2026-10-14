import { z } from 'zod';

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export const errorCodeSchema = z.enum(ERROR_CODES);

export const apiErrorDetailSchema = z.object({
  path: z.union([z.string(), z.array(z.union([z.string(), z.number()]))]).optional(),
  message: z.string(),
  code: z.string().optional(),
});

export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(z.record(z.unknown())).optional(),
    requestId: z.string().optional(),
  }),
});

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    details?: ApiErrorDetail[] | Record<string, unknown>[];
    requestId?: string;
  };
}

export interface ApiSuccess<T, M = Record<string, unknown>> {
  data: T;
  meta?: M;
}

export type ApiResponse<T, M = Record<string, unknown>> = ApiSuccess<T, M> | ApiErrorBody;
