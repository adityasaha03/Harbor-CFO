import type { ErrorCode, ApiErrorDetail } from '@harbor/contracts';

export interface ApiErrorOptions {
  code: ErrorCode;
  status: number;
  message: string;
  requestId?: string;
  details?: ApiErrorDetail[] | Record<string, unknown>[];
  cause?: unknown;
}

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly requestId?: string;
  readonly details?: ApiErrorDetail[] | Record<string, unknown>[];

  constructor(options: ApiErrorOptions) {
    super(options.message);
    this.name = 'ApiError';
    this.code = options.code;
    this.status = options.status;
    this.requestId = options.requestId;
    this.details = options.details;
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  static isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }
}
