# Architecture

Companion to the root [`README.md`](../README.md). This covers task
breakdown/prioritization (the brief's own assessment guideline #1), the
security and performance design in full, and the reasoning behind a few
decisions that aren't obvious from the code alone.

## Task breakdown & prioritization

Built in this order, each step verified before moving to the next:

1. **Data layer first** — the `User` Mongoose schema, exactly matching the
   brief's field list, with its indexes. Everything else depends on this
   being right, so it came before any HTTP concerns at all.
2. **Validation** — zod schemas for create/update/list-query/id-param,
   written and unit-tested (`tests/validators.unit.test.ts`) *before* wiring
   them into routes, so the rules themselves were verified in isolation
   first.
3. **Auth** — JWT sign/verify + the login endpoint + the `requireAuth`
   middleware, since every other route depends on it existing.
4. **The 5 CRUD endpoints**, in the order a client would naturally need
   them: create → list → get-by-id → update → delete.
5. **Centralized error handling** — retrofitted once real error cases
   showed up in testing (a malformed id, a duplicate email, an oversized
   body), replacing ad-hoc per-controller error responses with one
   consistent shape.
6. **Security hardening** — helmet, rate limiting, sanitization, payload
   limits — added as a deliberate pass once the functional behavior was
   solid, each one verified with a corresponding test
   (`tests/security.test.ts`) rather than assumed to work.
7. **Docs (Swagger) and the test suite** — written alongside the code
   they describe/verify, not after the fact; the full suite runs on every
   change.
8. **Deployment adapters** (`server.ts` traditional vs. `api/index.ts`
   serverless) last, once the core app was stable — see §"Two deploy
   entry points" below for why both exist.

## Security & performance — measure → where it lives

| Concern | Measure | Location |
|---|---|---|
| Fail-fast config | zod-validated `process.env`, crashes at boot on misconfiguration rather than failing confusingly on the first request | `src/config/env.ts` |
| Secure headers | `helmet()`, with CSP directives loosened *only* enough for Swagger UI's inline bootstrap script to run | `src/app.ts` |
| CORS | Explicit allowlist from `CORS_ORIGIN` (comma-separated), not a blanket `*` in spirit (defaults to `*` for assessment convenience, documented as something to tighten for real production use) | `src/app.ts` |
| Payload-size DoS | `express.json({ limit: "10kb" })`; a request over that limit gets a clean `413`, not a hang or crash | `src/app.ts`, `src/middleware/error.middleware.ts` |
| NoSQL injection, layer 1 | zod schemas reject non-primitive shapes outright — `{"email": {"$gt": ""}}` fails `z.string().email()` before anything reaches a query | `src/validators/*`, `src/middleware/validate.middleware.ts` |
| NoSQL injection, layer 2 | `express-mongo-sanitize` strips any `$`/`.`-prefixed key from body/params/query as defense in depth, logged when it fires | `src/app.ts` |
| Brute force | Two-tier `express-rate-limit`: generous globally, much stricter on `/auth/login` | `src/middleware/rateLimiter.middleware.ts` |
| Correct client IP behind a proxy | `app.set("trust proxy", 1)` in production — required for `express-rate-limit` to rate-limit the real client, not the platform's proxy | `src/app.ts` |
| No user enumeration | Login returns the identical "Invalid credentials" message for both a wrong password and an unknown email; `bcrypt.compare` always runs (even against a known-wrong email) so response timing doesn't leak which case it was | `src/controllers/auth.controller.ts` |
| Stateless, horizontally scalable auth | JWT only, no session store — any number of instances share nothing but the Mongo URI | `src/middleware/auth.middleware.ts` |
| Connection pooling | Bounded `maxPoolSize` on `mongoose.connect` | `src/config/db.ts` |
| Query efficiency | `.lean()` on every read (skips Mongoose document hydration); indexes on `email` (unique), `age`, `createdAt` | `src/models/user.model.ts`, controllers |
| Response size | gzip via `compression()` | `src/app.ts` |
| Pagination cost at scale | `limit` hard-capped at 100 server-side regardless of what's requested — a client can never force an unbounded query | `src/validators/user.validators.ts` |
| Duplicate-email race | Uniqueness enforced by the schema's unique index and a caught Mongo `E11000` error, not just an app-level "check then insert" (which leaves a race window) | `src/models/user.model.ts`, `src/middleware/error.middleware.ts` |
| Malformed-id crashes | `:id` validated as a Mongo ObjectId *before* it reaches a query — a `CastError` never happens in practice, but is also handled defensively if it did | `src/validators/user.validators.ts`, `src/middleware/error.middleware.ts` |
| Centralized, graceful errors | One error-handling middleware maps `ApiError` / `ZodError` / Mongoose `ValidationError`/`CastError` / Mongo `E11000` / body-parser's `PayloadTooLargeError` — anything else becomes a generic 500 with no stack trace leaked | `src/middleware/error.middleware.ts` |
| Async errors never crash the process | Every controller wrapped in `asyncHandler` (Express 4 doesn't auto-forward rejected promises to error middleware) | `src/utils/asyncHandler.ts` |
| Graceful shutdown | `SIGTERM`/`SIGINT` close the HTTP server, then the Mongo connection, before the process exits — no dropped in-flight requests on a rolling deploy | `src/server.ts` |

## Why Express 4, not 5

Deliberate, not an oversight. `express-mongo-sanitize` documents itself as
Express-4.x middleware and hasn't been updated for Express 5. More
concretely: Express 5 made `req.query` a read-only getter, and
`validate.middleware.ts` *reassigns* `req.query` with zod's
coerced/defaulted output (`?page=2` as the string `"2"` becomes the number
`2`, `limit` gets clamped, etc.) — that reassignment throws under Express 5.
Every other piece of this stack works fine on either major version, so
staying on the current, fully-maintained Express 4 line avoided fighting a
real incompatibility for no benefit an assessment would care about.

## Why the User model has no `updatedAt`

The brief's field list is exact: ID, Name, Email, Age, CreatedAt. Adding an
`updatedAt` "for completeness" would be a small, unrequested change to a
schema the brief explicitly enumerated — noted here so it reads as a
deliberate scope decision, not something forgotten.

## Auth design, in full

The User Profile has no password field, and the brief asks for
"token-based authentication (e.g. JWT) for the endpoints" — read as
*protect the CRUD routes*, not *build a login system on top of the User
model*. `POST /auth/login` checks `{ email, password }` against
`ADMIN_EMAIL`/`ADMIN_PASSWORD_HASH` env vars (the plaintext password is
never stored anywhere — only its bcrypt hash, generated once via
`npm run hash-password`) and issues a JWT on success. Every `/users/*`
route requires `Authorization: Bearer <token>`, verified statelessly
(no session store, no database lookup) by `requireAuth`.

## Two deploy entry points, one app

`src/app.ts` builds the Express app and exports it — it never calls
`.listen()`. Three different runtimes reuse it unchanged:

- **`src/server.ts`** — a normal long-running process: connects to Mongo
  once at boot, listens on a port, and shuts down gracefully on
  `SIGTERM`/`SIGINT`. Used locally and by any traditional host (Render,
  Heroku, a VM, a container).
- **`api/index.ts`** — a Vercel serverless function. It never calls
  `.listen()` (there's no persistent process to listen with) and caches
  the Mongoose connection *promise* at module scope so a warm Lambda
  container reuses one connection across many invocations instead of
  reconnecting to Mongo on every single request. `vercel.json` rewrites
  every incoming path to this one function.
- **The Jest test suite** — drives `app.ts` directly through Supertest,
  with a real (in-memory) MongoDB per test file. No network port, no
  deployment concerns, just the app and a database.

**Serverless caveat, stated plainly rather than glossed over:**
`express-rate-limit`'s in-memory store (used for both rate limiters) is
per-instance. Under concurrent Vercel invocations landing on *different*
warm containers, each enforces its configured limit independently rather
than sharing one global count. The protection is still real and still
meaningfully slows down abuse — it's just not an exactly-synchronized
global limit in that specific deployment mode. A deployment that needed an
exact distributed limit would swap in a shared store (e.g. Upstash Redis,
via `rate-limit-redis`) — not necessary for this assessment, but worth
being honest about rather than implying it's airtight everywhere.

## Testing strategy

55 tests across 9 files, `npm test` (Jest + Supertest + `mongodb-memory-server`):

- **Unit** (`validators.unit.test.ts`) — pure zod `.safeParse()` boundary
  checks (age 0/150/151/-1, malformed ids, email casing/trimming), no
  database involved.
- **Integration** (`health`, `auth`, `users.crud`, `users.validation`,
  `users.pagination`, `security`) — the full Express app, a real (in-memory)
  MongoDB, real HTTP requests via Supertest against a real listening server
  (see note below on why a *real* server, not just the bare app object).
- **Isolated** (`auth.ratelimit.test.ts`) — the one test that deliberately
  exceeds a rate limit lives in its own file so its repeated requests can
  never interfere with (or be interfered with by) other tests sharing the
  same in-memory rate-limiter state within a file.
- **Concurrency proof** (`concurrency.demo.test.ts`) — not required by the
  brief (Task 2 asks for pseudocode only), but a small, concrete
  demonstration that the atomic compare-and-swap pattern described in
  `DELIVERY_SLOTS_PSEUDOCODE.md` actually prevents overbooking: 20
  simulated concurrent bookings against a capacity-3 slot, asserting
  exactly 3 succeed.

**Why tests hit a real listening server (`app.listen(0)`) instead of
passing the bare Express `app` to Supertest.** Passing `app` directly makes
Supertest spin up a fresh ephemeral server per request — fine for a
handful of calls, but it caused intermittent `ECONNRESET`/"socket hang up"
failures under the higher-volume loops in the pagination and rate-limit
tests. Listening once per test file (`beforeAll`/`afterAll`) and reusing
that real server for every request in the file is both more realistic and
eliminated the flakiness entirely.

**Why the test admin password hash uses a low bcrypt cost factor (4) while
the real app uses 12.** bcrypt's compare time is governed by the cost
factor baked into the hash itself, not by any runtime setting — using the
same cost-12 hash the real app would use made the rate-limit test's
repeated real login attempts slow enough to be flaky across different
machines. A cost-4 hash, used only in `.env.test`, keeps the test suite
fast and deterministic without changing anything about how login actually
works in development or production.
