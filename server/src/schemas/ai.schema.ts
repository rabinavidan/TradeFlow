import { z } from 'zod';
import { TRADE_REQUEST_TYPES } from '../models/TradeRequest.js';

// Deliberately narrower than createTradeSchema: description generation only
// needs the fields that actually shape the prompt, and every field is
// optional except title — a user might ask for a draft description before
// filling in amount/currency/country.
export const generateDescriptionSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  customerName: z.string().trim().max(150).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().trim().max(3).optional(),
  country: z.string().trim().max(100).optional(),
  requestType: z.enum(TRADE_REQUEST_TYPES).optional(),
});
export type GenerateDescriptionInput = z.infer<typeof generateDescriptionSchema>;
