import type { NextFunction, Request, Response } from 'express';

type AsyncRouteHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Express 4 does not forward rejected promises from async handlers to the
 * error middleware automatically. Wrapping a handler with asyncHandler
 * catches that rejection and passes it to next(err) so the centralized
 * errorHandler still handles it.
 */
export function asyncHandler(handler: AsyncRouteHandler) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}
