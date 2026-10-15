import { createApp } from './app';
import { env } from './config/env';
import { connectMongo, disconnectMongo } from './core/db/mongo';
import { logger } from './core/logging/logger';

async function bootstrap(): Promise<void> {
  await connectMongo();

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, 'HarborCFO API server started successfully');
  });

  async function gracefulShutdown(signal: string): Promise<void> {
    logger.info({ signal }, 'Termination signal received; shutting down HTTP server gracefully');
    server.close(async () => {
      logger.info('HTTP server closed; disconnecting database');
      try {
        await disconnectMongo();
        logger.info('Database disconnected; process terminating cleanly');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during database disconnect');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Forceful shutdown after timeout');
      process.exit(1);
    }, 10000).unref();
  }

  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
}

void bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start API server');
  process.exit(1);
});
