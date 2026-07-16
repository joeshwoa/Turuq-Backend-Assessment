import rateLimit from "express-rate-limit";
import { env } from "../config/env";

/**
 * Two tiers: a generous general limit on the whole API, and a much
 * stricter one on /auth/login specifically, since that's the endpoint an
 * attacker would actually want to brute-force. Both respond with the same
 * `{ error }` shape as the rest of the app instead of express-rate-limit's
 * default plain-text body.
 */
export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: { code: "RATE_LIMITED", message: "Too many requests, please try again later" } });
  },
});

export const authLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res
      .status(429)
      .json({ error: { code: "RATE_LIMITED", message: "Too many login attempts, please try again later" } });
  },
});
