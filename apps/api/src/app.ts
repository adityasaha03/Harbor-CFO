import express, { type Express } from 'express';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { errorHandler } from './core/http/error-handler';
import { notFoundHandler } from './core/http/not-found';
import { logger } from './core/logging/logger';
import { requestIdMiddleware } from './core/logging/request-id';
import { createCorsMiddleware } from './core/security/cors';
import { createHelmetMiddleware } from './core/security/helmet';
import { healthRouter } from './features/health';
import { createApiRouter } from './routes';

export function createApp(): Express {
  const app = express();

  // 1. Request ID (honors incoming X-Request-Id or generates UUID)
  app.use(requestIdMiddleware);

  // 2. Structured request logging via pino-http (except in test mode)
  if (env.NODE_ENV !== 'test') {
    app.use(
      pinoHttp({
        logger,
        genReqId: (req) => req.id || (req.headers['x-request-id'] as string),
      }),
    );
  }

  // 3. Helmet security headers
  app.use(createHelmetMiddleware());

  // 4. CORS: strict WEB_ORIGIN, standard API headers, no credentials
  app.use(createCorsMiddleware());

  // 5. JSON body parser with 1MB limit
  app.use(express.json({ limit: '1mb' }));

  // 6. Public health check routes (unauthenticated)
  app.use('/health', healthRouter);

  // 7. Base API router under /api/v1 (rate limiter applied inside createApiRouter)
  app.use('/api/v1', createApiRouter());

  // 8. 404 handler for unmatched routes
  app.use(notFoundHandler);

  // 9. Central error handler (maps AppError, handles 500 without leaking internals)
  app.use(errorHandler);

  return app;
}
