import { Router } from 'express';
import { summary } from '../controllers/analytics.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const analyticsRouter = Router();

analyticsRouter.get('/summary', requireAuth, asyncHandler(summary));
