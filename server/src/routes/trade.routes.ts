import { Router } from 'express';
import { changeStatus, create, getOne, history, list, remove, update } from '../controllers/trade.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const tradeRouter = Router();

tradeRouter.use(requireAuth);

tradeRouter.get('/', asyncHandler(list));
tradeRouter.post('/', asyncHandler(create));
tradeRouter.get('/:id', asyncHandler(getOne));
tradeRouter.put('/:id', asyncHandler(update));
tradeRouter.delete('/:id', asyncHandler(remove));
tradeRouter.patch('/:id/status', asyncHandler(changeStatus));
tradeRouter.get('/:id/history', asyncHandler(history));
