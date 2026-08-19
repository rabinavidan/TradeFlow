import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';

async function main(): Promise<void> {
  await connectDB();

  const app = createApp();
  app.listen(env.PORT, () => {
    logger.info(`TradeFlow Lite API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
