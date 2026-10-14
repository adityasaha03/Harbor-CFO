import { createApp } from './app';
import { env } from './config/env';
import { logger } from './core/logging/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    'HarborCFO API server started successfully',
  );
});

function gracefulShutdown(signal: string): void {
  logger.info(
    { signal },
    'Termination signal received; shutting down HTTP server gracefully',
  );
  server.close(() => {
    logger.info('HTTP server closed; process terminating cleanly');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forceful shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
