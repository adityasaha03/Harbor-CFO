import type { ApiErrorDetail, ErrorCode } from '@harbor/contracts';

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: ErrorCode;
  readonly details?: ApiErrorDetail[] | Record<string, unknown>[];

  constructor(
    message: string,
    details?: ApiErrorDetail[] | Record<string, unknown>[],
  ) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code: ErrorCode = 'VALIDATION_ERROR';
}

export class UnauthenticatedError extends AppError {
  readonly statusCode = 401;
  readonly code: ErrorCode = 'UNAUTHENTICATED';

  constructor(
    message = 'Authentication required',
    details?: ApiErrorDetail[] | Record<string, unknown>[],
  ) {
    super(message, details);
  }
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code: ErrorCode = 'FORBIDDEN';

  constructor(
    message = 'Insufficient permissions',
    details?: ApiErrorDetail[] | Record<string, unknown>[],
  ) {
    super(message, details);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code: ErrorCode = 'NOT_FOUND';

  constructor(
    message = 'Resource not found',
    details?: ApiErrorDetail[] | Record<string, unknown>[],
  ) {
    super(message, details);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code: ErrorCode = 'CONFLICT';
}

export class PayloadTooLargeError extends AppError {
  readonly statusCode = 413;
  readonly code: ErrorCode = 'PAYLOAD_TOO_LARGE';

  constructor(
    message = 'Payload too large',
    details?: ApiErrorDetail[] | Record<string, unknown>[],
  ) {
    super(message, details);
  }
}

export class RateLimitedError extends AppError {
  readonly statusCode = 429;
  readonly code: ErrorCode = 'RATE_LIMITED';
  readonly retryAfterSeconds?: number;

  constructor(
    message = 'Too many requests, please try again later',
    details?: ApiErrorDetail[] | Record<string, unknown>[],
    retryAfterSeconds?: number,
  ) {
    super(message, details);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class InternalError extends AppError {
  readonly statusCode = 500;
  readonly code: ErrorCode = 'INTERNAL';

  constructor(
    message = 'An internal error occurred',
    details?: ApiErrorDetail[] | Record<string, unknown>[],
  ) {
    super(message, details);
  }
}
