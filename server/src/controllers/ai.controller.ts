import type { Request, Response } from 'express';
import { generateDescriptionSchema } from '../schemas/ai.schema.js';
import { generateDescription } from '../services/ai.service.js';
import { AppError } from '../utils/AppError.js';

export async function generateTradeDescription(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  const input = generateDescriptionSchema.parse(req.body);
  const description = await generateDescription(input);
  res.status(200).json({ description });
}
