import type { JwtPayload } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      /** Set by `auth.middleware.ts` once a Bearer token has been verified. */
      auth?: JwtPayload;
    }
  }
}

export {};
