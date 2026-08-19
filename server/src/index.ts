import type { Server } from 'node:http';
import { createApp } from './app.js';
import { connectDB, disconnectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Stops accepting new connections, lets in-flight requests finish, closes
 * the database connection, then exits — the sequence a container
 * orchestrator (Docker, Kubernetes) expects in response to SIGTERM before
 * it escalates to a hard kill. Without this, in-flight requests get cut
 * off mid-response on every deploy/restart.
 */
function registerGracefulShutdown(server: Server): void {
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');

    const forceExitTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExitTimer.unref();

    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'Error while closing HTTP server');
      }
      await disconnectDB();
      clearTimeout(forceExitTimer);
      logger.info('Shutdown complete');
      process.exit(err ? 1 : 0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * A crash the app didn't anticipate (a bug, not an AppError) means the
 * process is in an unknown state — logging and exiting lets the
 * orchestrator restart it cleanly, rather than limping on in a state
 * nothing tested for.
 */
function registerProcessSafetyNets(): void {
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection — exiting');
    process.exit(1);
  });
}

async function main(): Promise<void> {
  registerProcessSafetyNets();
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`TradeFlow Lite API listening on http://localhost:${env.PORT}`);
  });

  registerGracefulShutdown(server);
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
