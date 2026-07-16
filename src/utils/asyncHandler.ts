import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 does not forward a rejected Promise from an async route handler
 * to the error middleware on its own — an unhandled rejection there would
 * otherwise crash the process. Wrapping every controller in this utility
 * is the standard Express-4-era fix (Express 5 does this natively, but see
 * `app.ts`'s comment on why this project deliberately stays on Express 4).
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
