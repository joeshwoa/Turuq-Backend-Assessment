import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { z } from "zod";
import { ApiError } from "../utils/ApiError";

type Schemas = {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
};

/**
 * One generic middleware factory instead of hand-rolled validation in every
 * controller. On success it *replaces* req.body/params/query with the
 * parsed output — which matters because zod schemas here also coerce and
 * apply defaults (e.g. `?page=` becomes a real number, `limit` gets
 * clamped), so controllers always see clean, final values, never raw
 * strings from the wire.
 *
 * (This reassignment is exactly why the project stays on Express 4 — see
 * app.ts — Express 5 made `req.query` a read-only getter.)
 *
 * `params` failures get their own `INVALID_ID` error code rather than the
 * generic `VALIDATION_ERROR` — every route in this API that validates
 * `params` is validating an `:id`, so a malformed id is a distinct,
 * well-known case worth its own code rather than folding it into "some
 * field somewhere was invalid."
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        next(ApiError.invalidId());
        return;
      }
      req.params = result.data as typeof req.params;
    }

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        next(ApiError.badRequest("Invalid request data", z.flattenError(result.error)));
        return;
      }
      req.body = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        next(ApiError.badRequest("Invalid request data", z.flattenError(result.error)));
        return;
      }
      req.query = result.data as typeof req.query;
    }

    next();
  };
}
