import type { NextFunction, Request, Response } from "express";
import { Error as MongooseError } from "mongoose";
import { z } from "zod";
import { ApiError } from "../utils/ApiError";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";

type MongoServerErrorLike = Error & { code?: number; keyPattern?: Record<string, unknown> };

/**
 * The single place every error in the app funnels through — controllers
 * and middleware just `throw`/`next(err)`, never format a response
 * themselves. Anything unrecognized becomes a generic 500 with no stack
 * trace or internal detail leaked to the client, logged in full server-side
 * instead.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "Invalid request data", details: z.flattenError(err) } });
    return;
  }

  if (err instanceof MongooseError.ValidationError) {
    res.status(400).json({ error: { code: "VALIDATION_ERROR", message: err.message, details: err.errors } });
    return;
  }

  if (err instanceof MongooseError.CastError) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "Invalid id format" } });
    return;
  }

  const maybeMongoError = err as MongoServerErrorLike;
  if (maybeMongoError?.code === 11000) {
    const field = Object.keys(maybeMongoError.keyPattern ?? { email: 1 })[0] ?? "field";
    res.status(409).json({ error: { code: "DUPLICATE_EMAIL", message: `A user with this ${field} already exists` } });
    return;
  }

  // body-parser's own error for a request exceeding express.json()'s size
  // limit — a deliberately small cap (see app.ts) precisely so this path
  // gets exercised on any oversized-payload attempt rather than reaching
  // application code at all.
  if (err instanceof Error && err.name === "PayloadTooLargeError") {
    res.status(413).json({ error: { code: "VALIDATION_ERROR", message: "Request body too large" } });
    return;
  }

  logger.error({ err, path: req.originalUrl, method: req.method }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong. Please try again later.",
      ...(isProduction ? {} : { details: err instanceof Error ? err.message : String(err) }),
    },
  });
}
