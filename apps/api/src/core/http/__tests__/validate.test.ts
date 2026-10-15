import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ValidationError } from '../app-error';
import { validate } from '../validate';

describe('validate middleware', () => {
  it('passes valid body and replaces req.body with parsed output', () => {
    const schema = z.object({
      amount: z.number().int().positive(),
      description: z.string().min(1),
    });

    const middleware = validate({ body: schema });
    const req = {
      body: { amount: 5000, description: 'Test payment', extraField: 'ignored' },
    } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;
    let passedError: unknown;

    const next: NextFunction = (err?: unknown) => {
      nextCalled = true;
      passedError = err;
    };

    middleware(req, res, next);

    expect(nextCalled).toBe(true);
    expect(passedError).toBeUndefined();
    expect(req.body).toEqual({ amount: 5000, description: 'Test payment' });
  });

  it('fails invalid body and calls next with ValidationError and details', () => {
    const schema = z.object({
      email: z.string().email(),
      age: z.number().int().min(18),
    });

    const middleware = validate({ body: schema });
    const req = {
      body: { email: 'not-an-email', age: 16 },
    } as unknown as Request;
    const res = {} as Response;
    let passedError: unknown;

    const next: NextFunction = (err?: unknown) => {
      passedError = err;
    };

    middleware(req, res, next);

    expect(passedError).toBeInstanceOf(ValidationError);
    const valErr = passedError as ValidationError;
    expect(valErr.statusCode).toBe(400);
    expect(valErr.code).toBe('VALIDATION_ERROR');
    expect(valErr.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'email' }),
        expect.objectContaining({ path: 'age' }),
      ]),
    );
  });

  it('validates query and route params', () => {
    const querySchema = z.object({
      page: z.coerce.number().int().positive(),
    });
    const paramsSchema = z.object({
      id: z.string().min(5),
    });

    const middleware = validate({ query: querySchema, params: paramsSchema });
    const req = {
      query: { page: '2' },
      params: { id: 'item-123' },
    } as unknown as Request;
    const res = {} as Response;
    let nextCalled = false;

    middleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.query).toEqual({ page: 2 });
    expect(req.params).toEqual({ id: 'item-123' });
  });
});
