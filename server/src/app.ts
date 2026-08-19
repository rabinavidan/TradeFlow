import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { openApiSpec } from './docs/openapi.js';
import { requestLogger } from './middleware/requestLogger.js';
import { notFoundHandler } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';
import { healthRouter } from './routes/health.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { tradeRouter } from './routes/trade.routes.js';
import { analyticsRouter } from './routes/analytics.routes.js';
import { aiRouter } from './routes/ai.routes.js';

export function createApp(): Express {
  const app = express();

  // HSTS tells the browser "only ever use HTTPS for this origin, remember
  // that for a year" — correct in production behind real TLS, but actively
  // harmful in development/test: the API here is served over plain HTTP,
  // and a browser that's cached an HSTS policy for localhost will keep
  // silently retrying requests over HTTPS in the background (which fail
  // instantly against a non-TLS server) for as long as that policy lives.
  app.use(helmet({ hsts: env.NODE_ENV === 'production' }));
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(requestLogger);

  // Interactive API docs, generated from a hand-written OpenAPI spec —
  // useful during manual testing/demos and as a reviewable API contract.
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/trades', tradeRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/ai', aiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
