import rateLimit from 'express-rate-limit';

/**
 * Sensitive auth endpoints (login/register) get a tighter limit than the
 * rest of the API to slow down credential-stuffing / brute-force attempts.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please try again later.' },
  },
});
