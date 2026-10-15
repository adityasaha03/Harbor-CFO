import type { RequestHandler } from 'express';
import helmet from 'helmet';

export function createHelmetMiddleware(): RequestHandler {
  return helmet();
}
