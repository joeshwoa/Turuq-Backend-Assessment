import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import pinoHttp from "pino-http";
import swaggerUi from "swagger-ui-express";
import { env, isProduction, isTest } from "./config/env";
import { logger } from "./config/logger";
import { swaggerSpec } from "./config/swagger";
import routes from "./routes";
import { generalLimiter } from "./middleware/rateLimiter.middleware";
import { notFoundHandler } from "./middleware/notFound.middleware";
import { errorHandler } from "./middleware/error.middleware";

/**
 * This module only builds and exports the Express app — it never calls
 * `.listen()`. That's what lets the exact same app be reused by three very
 * different runtimes without duplicating any middleware/route wiring:
 * `server.ts` (a normal long-running process), `api/index.ts` (a Vercel
 * serverless function), and the Jest test suite (via Supertest, which
 * drives the app directly with no network socket at all).
 *
 * Deliberately built on Express **4**, not 5: `express-mongo-sanitize`
 * documents itself as Express-4.x middleware, and Express 5 made `req.query`
 * a read-only getter — `validate.middleware.ts` reassigns `req.query` with
 * the parsed/coerced/defaulted values from zod, which would throw on
 * Express 5. Boring, compatible, currently-maintained technology beats
 * chasing the newest major version for an assessment.
 */
export function createApp(): Express {
  const app = express();

  if (isProduction) {
    // Required for express-rate-limit (and req.ip) to see the *real*
    // client IP behind a reverse proxy (Render/Vercel/Heroku all sit in
    // front of the app) instead of the proxy's own address.
    app.set("trust proxy", 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          // Swagger UI's bundled JS bootstraps itself with an inline
          // <script>; without this it silently fails to render under
          // Helmet's otherwise-strict default CSP. The JSON API itself
          // never executes anything, so this loosening has no real
          // effect on it — CSP only matters to a browser rendering HTML.
          "script-src": ["'self'", "'unsafe-inline'"],
          "style-src": ["'self'", "'unsafe-inline'"],
        },
      },
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN === "*" ? "*" : env.CORS_ORIGIN.split(",").map((o) => o.trim()),
    })
  );

  app.use(compression());
  // Small, deliberate cap — a large request body is itself a denial-of-service vector.
  app.use(express.json({ limit: "10kb" }));

  // NoSQL-injection defense, layer 2 (layer 1 is zod rejecting non-primitive
  // shapes before anything reaches a query — see validate.middleware.ts).
  // Strips any key starting with "$" or containing "." from body/params/query.
  app.use(
    mongoSanitize({
      onSanitize: ({ req, key }) => {
        logger.warn({ path: req.path, key }, "Sanitized a potentially malicious key from request");
      },
    })
  );

  app.use(pinoHttp({ logger, autoLogging: !isTest }));

  app.use(generalLimiter);

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", uptime: process.uptime() });
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));

  app.use("/api/v1", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
