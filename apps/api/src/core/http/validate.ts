import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import type { ApiErrorDetail } from '@harbor/contracts';
import { ValidationError } from './app-error';

export interface ValidationSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(
          new ValidationError('Validation failed for route params', details),
        );
      }
      req.params = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(
          new ValidationError('Validation failed for query parameters', details),
        );
      }
      req.query = result.data;
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        const details: ApiErrorDetail[] = result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
        }));
        return next(
          new ValidationError('Validation failed for request body', details),
        );
      }
      req.body = result.data;
    }

    next();
  };
}
