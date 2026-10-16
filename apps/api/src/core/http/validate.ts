import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import type { ApiErrorDetail } from '@harbor/contracts';
import { ValidationError } from './app-error';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function hasMongoOperator(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
    if (key.startsWith('$') || key.includes('.') || key.includes('[$') || key.endsWith(']')) return true;
    if (typeof val === 'object' && val !== null && hasMongoOperator(val)) return true;
  }
  return false;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (
      (req.params && hasMongoOperator(req.params)) ||
      (req.query && hasMongoOperator(req.query)) ||
      (req.body && hasMongoOperator(req.body))
    ) {
      return next(new ValidationError('Request contains forbidden operator characters ($ or .)'));
    }
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(new ValidationError('Validation failed for route params', details));
      }
      try {
        req.params = result.data;
      } catch {
        Object.defineProperty(req, 'params', {
          value: result.data,
          configurable: true,
          enumerable: true,
          writable: true,
        });
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(new ValidationError('Validation failed for query parameters', details));
      }
      try {
        req.query = result.data;
      } catch {
        Object.defineProperty(req, 'query', {
          value: result.data,
          configurable: true,
          enumerable: true,
          writable: true,
        });
      }
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(new ValidationError('Validation failed for request body', details));
      }
      req.body = result.data;
    }

    next();
  };
}
