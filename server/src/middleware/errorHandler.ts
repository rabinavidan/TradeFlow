import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

function toErrorBody(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof AppError) {
    return {
      status: err.statusCode,
      body: { error: { code: err.code, message: err.message, details: err.details } },
    };
  }

  if (err instanceof ZodError) {
    return {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request data failed validation',
          details: err.flatten(),
        },
      },
    };
  }

  if (err instanceof mongoose.Error.CastError) {
    return {
      status: 400,
      body: { error: { code: 'INVALID_ID', message: `Invalid identifier: ${err.value}` } },
    };
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: 422,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request data failed validation',
          details: err.errors,
        },
      },
    };
  }

  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  ) {
    return {
      status: 409,
      body: { error: { code: 'DUPLICATE_KEY', message: 'A record with this value already exists' } },
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong. Please try again later.',
      },
    },
  };
}

// Express recognizes error middleware by its 4-argument signature, so _next
// must stay even though it is unused.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const { status, body } = toErrorBody(err);
  // pino-http (see requestLogger.ts) assigns req.id per request and echoes
  // it on the x-request-id response header; including it in the error body
  // too means a user reporting "I got error X" can hand over one id that
  // pinpoints the exact log line, no timestamp/description matching needed.
  body.error.requestId = req.id ? String(req.id) : undefined;

  if (status >= 500) {
    logger.error({ err, path: req.originalUrl, method: req.method }, 'Unhandled error');
  } else {
    logger.warn({ code: body.error.code, path: req.originalUrl, method: req.method }, body.error.message);
  }

  if (status >= 500 && env.NODE_ENV === 'production') {
    body.error.message = 'Something went wrong. Please try again later.';
  }

  res.status(status).json(body);
}
