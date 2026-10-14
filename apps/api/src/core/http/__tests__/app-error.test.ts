import { describe, expect, it } from 'vitest';
import {
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  PayloadTooLargeError,
  RateLimitedError,
  UnauthenticatedError,
  ValidationError,
} from '../app-error';

describe('AppError classes', () => {
  it('creates ValidationError with status 400 and code VALIDATION_ERROR', () => {
    const error = new ValidationError('Invalid input', [
      { path: 'email', message: 'Invalid email' },
    ]);
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.message).toBe('Invalid input');
    expect(error.details).toEqual([{ path: 'email', message: 'Invalid email' }]);
  });

  it('creates UnauthenticatedError with status 401 and code UNAUTHENTICATED', () => {
    const error = new UnauthenticatedError();
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('UNAUTHENTICATED');
    expect(error.message).toBe('Authentication required');
  });

  it('creates ForbiddenError with status 403 and code FORBIDDEN', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('FORBIDDEN');
    expect(error.message).toBe('Insufficient permissions');
  });

  it('creates NotFoundError with status 404 and code NOT_FOUND', () => {
    const error = new NotFoundError('Invoice not found');
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('NOT_FOUND');
    expect(error.message).toBe('Invoice not found');
  });

  it('creates ConflictError with status 409 and code CONFLICT', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });

  it('creates PayloadTooLargeError with status 413 and code PAYLOAD_TOO_LARGE', () => {
    const error = new PayloadTooLargeError('CSV file exceeds 10MB');
    expect(error.statusCode).toBe(413);
    expect(error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('creates RateLimitedError with status 429, code RATE_LIMITED, and retryAfterSeconds', () => {
    const error = new RateLimitedError(
      'Rate limit exceeded',
      undefined,
      60,
    );
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe('RATE_LIMITED');
    expect(error.retryAfterSeconds).toBe(60);
  });

  it('creates InternalError with status 500 and code INTERNAL', () => {
    const error = new InternalError();
    expect(error.statusCode).toBe(500);
    expect(error.code).toBe('INTERNAL');
  });
});
