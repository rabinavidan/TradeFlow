import type { Request, Response } from 'express';
import { getAnalyticsSummary } from '../services/analytics.service.js';
import { AppError } from '../utils/AppError.js';

export async function summary(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  const result = await getAnalyticsSummary(req.user);
  res.status(200).json(result);
}
