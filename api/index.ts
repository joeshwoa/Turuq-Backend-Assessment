import type { IncomingMessage, ServerResponse } from "http";
import mongoose from "mongoose";
import { createApp } from "../src/app";
import { env } from "../src/config/env";
import { logger } from "../src/config/logger";

/**
 * Vercel serverless entry point. This is deliberately a *different* file
 * from `src/server.ts` — a serverless function must never call
 * `app.listen()` (there's no persistent process to listen with), and it
 * must not reconnect to MongoDB on every single invocation the way a
 * naive `connectDB()`-per-request would.
 *
 * The fix is the standard serverless+Mongoose pattern: cache the
 * connection *promise* at module scope. Vercel keeps a Lambda container
 * warm between requests for a while, re-running this module's top-level
 * code only on a cold start — so `connectionPromise` survives across many
 * invocations of the same warm instance, and `mongoose.connect()` itself
 * is only ever called once per container.
 *
 * Known caveat, documented here rather than glossed over: `express-rate-limit`'s
 * default in-memory store (used in `app.ts`) is per-instance — under
 * concurrent serverless invocations across *different* containers, the
 * rate limit is enforced independently by each, not as one shared global
 * count. The correct measure is still applied and still meaningfully
 * slows down abuse; a deployment that needed an exact distributed limit
 * would swap in a shared store (e.g. Upstash Redis, which has a
 * ready-made `rate-limit-redis` store) — not required for this assessment,
 * but worth being explicit about rather than implying it's airtight here.
 */
let connectionPromise: Promise<typeof mongoose> | null = null;

function getConnection(): Promise<typeof mongoose> {
  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(env.MONGODB_URI, { maxPoolSize: env.MONGODB_MAX_POOL_SIZE })
      .catch((err) => {
        // Let the next invocation try again instead of caching a permanent failure.
        connectionPromise = null;
        throw err;
      });
  }
  return connectionPromise;
}

const app = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await getConnection();
  } catch (err) {
    logger.error({ err }, "Failed to connect to MongoDB in serverless handler");
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Database unavailable" } }));
    return;
  }

  // An Express app instance is itself a valid (req, res) => void handler —
  // no extra adapter package needed to run it on Vercel's Node runtime.
  app(req, res);
}
