import swaggerJsdoc from "swagger-jsdoc";

/**
 * Reads `@openapi` JSDoc blocks straight out of the route files. Pointed at
 * `src/routes/*.ts` rather than `dist/routes/*.js` deliberately: swagger-jsdoc
 * just scans for comment blocks (it doesn't type-check or execute anything),
 * and `tsc` strips comments from compiled output by default — reading the
 * TypeScript source works identically whether the process was started via
 * `tsx` (dev) or the compiled `dist/server.js` (prod), as long as `src/`
 * ships alongside `dist/`, which it does here.
 */
export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Turuq Backend Assessment API",
      version: "1.0.0",
      description:
        "User Profiles CRUD API built for Turuq's backend technical assessment. " +
        "Every /users route requires a Bearer token obtained from /auth/login.",
    },
    servers: [
      {
        url: "https://turuq-backend-assessment.vercel.app/api/v1",
        description: "Production (Vercel) — use this to try the API live",
      },
      { url: "/api/v1", description: "Relative — current host" },
    ],
    tags: [
      { name: "Auth", description: "Obtain a JWT" },
      { name: "Users", description: "User profile CRUD" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  },
  apis: ["./src/routes/*.ts"],
});
