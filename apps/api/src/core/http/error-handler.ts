import type { ErrorRequestHandler } from 'express';
import type { ApiErrorBody } from '@harbor/contracts';
import { AppError, RateLimitedError } from './app-error';
import { logger } from '../logging/logger';

export const errorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next,
): void => {
  const requestId = (req.id as string) || (req.headers['x-request-id'] as string);

  if (err instanceof AppError) {
    if (err instanceof RateLimitedError && err.retryAfterSeconds !== undefined) {
      res.setHeader('Retry-After', String(err.retryAfterSeconds));
    }

    const body: ApiErrorBody = {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    };

    res.status(err.statusCode).json(body);
    return;
  }

  // Body parser size and syntax errors
  if ((err as { type?: string }).type === 'entity.too.large' || (err as { status?: number }).status === 413) {
    const body: ApiErrorBody = {
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Payload exceeds maximum allowed size of 1MB',
        requestId,
      },
    };
    res.status(413).json(body);
    return;
  }

  if ((err as { type?: string }).type === 'entity.parse.failed' || (err as { status?: number }).status === 400) {
    const body: ApiErrorBody = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Malformed request payload',
        requestId,
      },
    };
    res.status(400).json(body);
    return;
  }

  // Unknown internal server error
  logger.error({ err, requestId }, 'Unhandled internal server error');

  const body: ApiErrorBody = {
    error: {
      code: 'INTERNAL',
      message: 'An internal error occurred',
      requestId,
    },
  };

  res.status(500).json(body);
};
