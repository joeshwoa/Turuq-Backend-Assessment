import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";

/** Mounted after every real route — anything that reaches here matched no route at all. */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}
