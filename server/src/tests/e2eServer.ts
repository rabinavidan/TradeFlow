import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Boots a real API server against a real (in-memory) MongoDB for the
 * Playwright E2E suite. Not part of the production build (excluded via
 * tsconfig.build.json's src/tests exclusion) — this is test infrastructure
 * only, started by e2e/playwright.config.ts's webServer option.
 */
// Pinned so the Playwright suite's DB fixture helper (e2e/utils/db.ts) can
// connect to the same instance directly, for setup only a real UI/API
// intentionally doesn't expose (e.g. promoting a user to "reviewer").
const E2E_MONGO_PORT = 27117;

async function main(): Promise<void> {
  const mongod = await MongoMemoryServer.create({ instance: { port: E2E_MONGO_PORT } });

  process.env.NODE_ENV = 'development';
  process.env.MONGODB_URI = mongod.getUri('tradeflow-e2e');
  process.env.JWT_SECRET ??= 'e2e-test-secret-do-not-use-in-production';
  process.env.CORS_ORIGIN ??= 'http://localhost:5183';
  process.env.PORT ??= '4099';

  const { connectDB } = await import('../config/db.js');
  const { createApp } = await import('../app.js');
  const { env } = await import('../config/env.js');

  await connectDB();
  const app = createApp();
  app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`E2E test server listening on :${env.PORT}`);
  });
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
