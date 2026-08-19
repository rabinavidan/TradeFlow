import { Router } from 'express';
import { login, me, register } from '../controllers/auth.controller.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, asyncHandler(register));
authRouter.post('/login', authRateLimiter, asyncHandler(login));
authRouter.get('/me', requireAuth, asyncHandler(me));
