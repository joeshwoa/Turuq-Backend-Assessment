import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Traditional (non-serverless) connection: connect once at boot, keep the
 * connection for the process lifetime. Used by `server.ts` and the test
 * suite's setup. The serverless entry point (`api/index.ts`) uses a
 * different, cached-across-invocations variant — see the comment there for
 * why a plain `connectDB()` call per-request would be wrong on Vercel.
 */
export async function connectDB(): Promise<void> {
  mongoose.connection.on("connected", () => logger.info("MongoDB connected"));
  mongoose.connection.on("error", (err) => logger.error({ err }, "MongoDB connection error"));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));

  await mongoose.connect(env.MONGODB_URI, {
    maxPoolSize: env.MONGODB_MAX_POOL_SIZE,
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
