import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Runs once for the whole Vitest run (not per test file). Starts a single
 * in-memory MongoDB instance and points every test file at it via
 * MONGODB_URI, so tests never touch a real database.
 */
export default async function globalSetup() {
  const mongod = await MongoMemoryServer.create();

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongod.getUri('tradeflow-test');
  process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
  process.env.CORS_ORIGIN = 'http://localhost:5173';

  return async () => {
    await mongod.stop();
  };
}
