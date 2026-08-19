import { z } from 'zod';
import { TRADE_REQUEST_TYPES, TRADE_STATUSES } from '../models/TradeRequest.js';

export const createTradeSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(150),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z
    .string()
    .trim()
    .length(3, 'Currency must be a 3-letter code, e.g. USD')
    .transform((v) => v.toUpperCase()),
  country: z.string().trim().min(2, 'Country is required').max(100),
  requestType: z.enum(TRADE_REQUEST_TYPES),
  description: z.string().trim().max(2000).optional().default(''),
});
export type CreateTradeInput = z.infer<typeof createTradeSchema>;

export const updateTradeSchema = createTradeSchema.partial();
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;

export const listTradesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().min(1).optional(),
  status: z.enum(TRADE_STATUSES).optional(),
  requestType: z.enum(TRADE_REQUEST_TYPES).optional(),
  sortBy: z.enum(['createdAt', 'amount', 'title', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
export type ListTradesQuery = z.infer<typeof listTradesQuerySchema>;
