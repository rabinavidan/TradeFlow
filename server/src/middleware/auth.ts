import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';
import type { UserRole } from '../models/User.js';

/**
 * Verifies the Bearer token on the Authorization header and attaches the
 * decoded payload to req.user. Throws 401 for anything missing/invalid.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized();
  }

  const token = header.slice('Bearer '.length);
  try {
    req.user = verifyAccessToken(token);
  } catch {
    throw AppError.unauthorized('Invalid or expired token');
  }

  next();
}

/**
 * Must run after requireAuth. Restricts a route to specific roles
 * (authorization, as opposed to requireAuth's authentication check).
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized();
    }
    if (!roles.includes(req.user.role)) {
      throw AppError.forbidden();
    }
    next();
  };
}
