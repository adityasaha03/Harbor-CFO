import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { ForbiddenError, RateLimitedError } from '../app-error';
import { errorHandler } from '../error-handler';
import { created, noContent, ok } from '../respond';

describe('Error handler and respond helpers', () => {
  it('maps AppError to response envelope and status code', () => {
    const error = new ForbiddenError('Owner access required');
    const req = {
      id: 'req-test-123',
      headers: {},
    } as unknown as Request;

    let responseStatus = 0;
    let responseBody: unknown;

    const res = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        return this;
      },
      setHeader: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();
    errorHandler(error, req, res, next);

    expect(responseStatus).toBe(403);
    expect(responseBody).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Owner access required',
        requestId: 'req-test-123',
      },
    });
  });

  it('sets Retry-After header for RateLimitedError', () => {
    const error = new RateLimitedError('Rate limit exceeded', undefined, 45);
    const req = {
      id: 'req-rate-limit',
      headers: {},
    } as unknown as Request;

    const setHeader = vi.fn();
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader,
    } as unknown as Response;

    const next = vi.fn();
    errorHandler(error, req, res, next);

    expect(setHeader).toHaveBeenCalledWith('Retry-After', '45');
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('maps unexpected non-AppError to 500 INTERNAL without leaking details', () => {
    const unexpectedError = new Error('Database password leak: secret123');
    const req = {
      id: 'req-unexpected',
      headers: {},
    } as unknown as Request;

    let responseStatus = 0;
    let responseBody: unknown;

    const res = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        return this;
      },
      setHeader: vi.fn(),
    } as unknown as Response;

    const next = vi.fn();
    errorHandler(unexpectedError, req, res, next);

    expect(responseStatus).toBe(500);
    expect(responseBody).toEqual({
      error: {
        code: 'INTERNAL',
        message: 'An internal error occurred',
        requestId: 'req-unexpected',
      },
    });
    // Ensure secret message is never leaked in the response
    expect(JSON.stringify(responseBody)).not.toContain('secret123');
  });

  it('formats success responses using ok, created, and noContent', () => {
    let responseStatus = 0;
    let responseBody: unknown;
    let ended = false;

    const res = {
      status(code: number) {
        responseStatus = code;
        return this;
      },
      json(body: unknown) {
        responseBody = body;
        return this;
      },
      end() {
        ended = true;
      },
    } as unknown as Response;

    ok(res, { balance: 1000 }, { page: 1 });
    expect(responseStatus).toBe(200);
    expect(responseBody).toEqual({
      data: { balance: 1000 },
      meta: { page: 1 },
    });

    created(res, { id: 'item-1' });
    expect(responseStatus).toBe(201);
    expect(responseBody).toEqual({
      data: { id: 'item-1' },
    });

    noContent(res);
    expect(responseStatus).toBe(204);
    expect(ended).toBe(true);
  });
});
