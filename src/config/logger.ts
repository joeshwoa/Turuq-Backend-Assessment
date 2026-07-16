import pino from "pino";
import { isProduction } from "./env";

/**
 * pino over console.log/morgan: it's async and structured (JSON in
 * production, human-readable in dev), so logging under real load doesn't
 * block the event loop the way synchronous console writes can.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProduction ? "info" : "debug"),
  transport: isProduction
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
});
