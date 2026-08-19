import { z } from 'zod';
import { TRADE_STATUSES } from '../models/TradeRequest.js';

export const statusTransitionSchema = z.object({
  status: z.enum(TRADE_STATUSES),
  comment: z.string().trim().max(1000).optional().default(''),
});
export type StatusTransitionInput = z.infer<typeof statusTransitionSchema>;
