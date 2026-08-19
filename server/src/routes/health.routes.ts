import { Router } from 'express';
import { isDBConnected } from '../config/db.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const dbConnected = isDBConnected();
  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? 'ok' : 'degraded',
    db: dbConnected ? 'connected' : 'disconnected',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
