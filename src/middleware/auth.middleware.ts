import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyToken } from "../utils/jwt";

/**
 * Protects every /users/* route (mounted once via `router.use` in
 * user.routes.ts, rather than repeated per-route) — this is the "token-based
 * authentication for the endpoints" the brief asks for. Stateless: nothing
 * is looked up in a session store or database, so this scales horizontally
 * with zero shared state between instances.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(ApiError.unauthorized("Missing or malformed Authorization header"));
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    req.auth = verifyToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired token"));
  }
}
