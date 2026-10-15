import type { Response } from 'express';
import type { ApiSuccess } from '@harbor/contracts';

export function ok<T, M = Record<string, unknown>>(
  res: Response,
  data: T,
  meta?: M,
  statusCode = 200,
): void {
  const body: ApiSuccess<T, M> = { data };
  if (meta !== undefined) {
    body.meta = meta;
  }
  res.status(statusCode).json(body);
}

export function created<T, M = Record<string, unknown>>(res: Response, data: T, meta?: M): void {
  ok(res, data, meta, 201);
}

export function noContent(res: Response): void {
  res.status(204).end();
}
