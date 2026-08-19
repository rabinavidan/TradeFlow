import type { Request, Response } from 'express';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';
import { getUserById, loginUser, registerUser } from '../services/auth.service.js';
import { AppError } from '../utils/AppError.js';

export async function register(req: Request, res: Response): Promise<void> {
  const input = registerSchema.parse(req.body);
  const { user, token } = await registerUser(input);
  res.status(201).json({ user, token });
}

export async function login(req: Request, res: Response): Promise<void> {
  const input = loginSchema.parse(req.body);
  const { user, token } = await loginUser(input);
  res.status(200).json({ user, token });
}

export async function me(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw AppError.unauthorized();
  }
  const user = await getUserById(req.user.sub);
  res.status(200).json({ user });
}
