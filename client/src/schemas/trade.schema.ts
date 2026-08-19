import { z } from 'zod';

const REQUEST_TYPE_VALUES = ['Letter of Credit', 'Guarantee', 'Collection', 'Other'] as const;

export const tradeFormSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
  customerName: z.string().trim().min(2, 'Customer name must be at least 2 characters').max(150),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  currency: z
    .string()
    .trim()
    .length(3, 'Use a 3-letter currency code, e.g. USD')
    .transform((v) => v.toUpperCase()),
  country: z.string().trim().min(2, 'Country is required').max(100),
  requestType: z.enum(REQUEST_TYPE_VALUES),
  description: z.string().trim().max(2000).optional().default(''),
});
export type TradeFormValues = z.infer<typeof tradeFormSchema>;
