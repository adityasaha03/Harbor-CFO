import type { RequestHandler } from 'express';
import cors from 'cors';
import { env } from '../../config/env';

export function createCorsMiddleware(allowedOrigin = env.WEB_ORIGIN): RequestHandler {
  return cors({
    origin: (origin, callback) => {
      if (!origin || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'X-Tenant-Id',
      'Content-Type',
      'Idempotency-Key',
      'Last-Event-ID',
      'X-Request-Id',
    ],
    credentials: false,
    maxAge: 86400,
  });
}
