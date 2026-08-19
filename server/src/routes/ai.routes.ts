import { Router } from 'express';
import { generateTradeDescription } from '../controllers/ai.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const aiRouter = Router();

aiRouter.post('/generate-description', requireAuth, asyncHandler(generateTradeDescription));
