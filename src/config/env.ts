import dotenv from "dotenv";
import { z } from "zod";

// Loads `.env` into `process.env` for local development. On a platform that
// injects env vars directly (Vercel, Render, Heroku, ...) this is a no-op —
// dotenv never overrides variables that are already set. The test suite
// loads `.env.test` separately, earlier, via Jest's `setupFiles`
// (tests/jest.env.ts) — before this module (and its parse below) is ever
// imported.
dotenv.config();

/**
 * Validates every environment variable the app depends on, once, at boot.
 * A misconfigured deployment fails immediately and loudly here — instead
 * of the far worse alternative of booting "successfully" and then throwing
 * a confusing error on the first request that happens to need the missing
 * value (or, worse, silently misbehaving, e.g. an empty JWT secret).
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(10),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("1h"),

  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be a valid email"),
  ADMIN_PASSWORD_HASH: z.string().min(1, "ADMIN_PASSWORD_HASH is required"),

  CORS_ORIGIN: z.string().default("*"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Deliberately not using the app's own logger here — logger config could
  // itself depend on env vars, and this failure must never be silent.
  console.error("Invalid environment configuration:\n", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
