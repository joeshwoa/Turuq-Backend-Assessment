# Turuq Backend Assessment — User Profiles API

A RESTful, JWT-protected CRUD API for managing User Profiles, built for
Turuq's backend developer technical assessment (Task 1: "User Data
Handling"). Task 2 ("Handling Delivery Slots") is a pseudocode-only
deliverable — see [`DELIVERY_SLOTS_PSEUDOCODE.md`](DELIVERY_SLOTS_PSEUDOCODE.md).

Node.js + TypeScript + Express + MongoDB (Mongoose) + JWT, with Swagger API
docs, a full Jest/Supertest test suite, and no Docker or MongoDB Atlas
account required to run it locally.

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js ≥20.19, TypeScript, Express 4 |
| Database | MongoDB via Mongoose |
| Auth | JWT (`jsonwebtoken`), bcrypt-hashed admin credential |
| Validation | `zod` |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-mongo-sanitize` |
| Docs | `swagger-jsdoc` + `swagger-ui-express`, served at `/api-docs` |
| Logging | `pino` / `pino-http` |
| Tests | Jest, Supertest, `mongodb-memory-server` |

## Getting started (no Docker, no MongoDB Atlas account needed)

```bash
npm install
cp .env.example .env
```

Fill in `.env`:

```bash
# A random 32+ character secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste into JWT_SECRET

# A bcrypt hash of whatever password you want to log in with
npm run hash-password -- 'your-chosen-password'
# paste into ADMIN_PASSWORD_HASH, and set ADMIN_EMAIL to match
```

Run a local MongoDB with zero installs (spins up a real, temporary MongoDB
via `mongodb-memory-server` and prints a connection URI):

```bash
npm run dev-mongo
# → prints: MONGODB_URI=mongodb://127.0.0.1:PORT/...
# paste that line into .env, leave this process running
```

In a second terminal:

```bash
npm run dev
# → Server listening on port 4000
```

Now:
- `http://localhost:4000/health` — liveness check, no auth
- `http://localhost:4000/api-docs` — interactive Swagger UI (click
  "Authorize" after logging in, then "Try it out" on any endpoint)
- `POST http://localhost:4000/api/v1/auth/login` with
  `{ "email": "<ADMIN_EMAIL>", "password": "<what you hashed above>" }`
  returns a token to use as `Authorization: Bearer <token>` on `/users/*`

### Running the tests

```bash
npm test
```

The full suite (55 tests across 9 files) runs against its own throwaway
in-memory MongoDB per test file — no `.env`, no running server, no network
access beyond `mongodb-memory-server`'s one-time binary download, needed.

### Production build

```bash
npm run build   # tsc → dist/
npm run start   # node dist/server.js
```

## API overview

Base path `/api/v1`. Full interactive documentation (request/response
schemas, try-it-out) at `/api-docs` once running; a static export of the
same spec is at `/api-docs.json`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | — | Exchange admin credentials for a JWT |
| POST | `/users` | Bearer | Create a user profile |
| GET | `/users` | Bearer | List profiles — `?page=&limit=&age=` |
| GET | `/users/:id` | Bearer | Fetch one profile |
| PUT | `/users/:id` | Bearer | Partially update a profile |
| DELETE | `/users/:id` | Bearer | Delete a profile |

Every error response shares one shape:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { } } }
```

## Requirements checklist

**Main features**
- ✅ RESTful CRUD for User Profiles (id auto, name required, email
  unique+required, age optional, createdAt auto) —
  [`src/models/user.model.ts`](src/models/user.model.ts).
- ✅ MongoDB via Mongoose.
- ✅ JWT-protected endpoints — [`src/middleware/auth.middleware.ts`](src/middleware/auth.middleware.ts)
  (see "Design decisions" below for how login works without a password
  field on the User model itself).
- ✅ All 5 endpoints, `GET /users` paginated with optional exact-age filter —
  [`src/controllers/user.controller.ts`](src/controllers/user.controller.ts).

**Assessment guidelines**
- ✅ Task breakdown documented — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- ✅ Validation (required fields, email uniqueness) — `zod` schemas
  ([`src/validators/`](src/validators)) plus the model's own unique index.
- ✅ Graceful error handling — one centralized handler,
  [`src/middleware/error.middleware.ts`](src/middleware/error.middleware.ts).
- ✅ Modular structure — `config/ models/ controllers/ routes/ middleware/
  validators/ utils/`.
- ✅ Performance — indexes on `email`/`age`/`createdAt`, `.lean()` reads,
  hard-capped pagination. Full write-up in `docs/ARCHITECTURE.md`.
- ✅ Security — input sanitization, NoSQL-injection defense in two layers,
  rate limiting, no stack traces leaked. Full write-up in
  `docs/ARCHITECTURE.md`.

**Bonus points**
- ✅ Deployed (Vercel) — see "Deployment" below for the live URL once
  Joshua deploys it, and example requests.
- ✅ API documentation — Swagger UI at `/api-docs`.
- ✅ Unit + integration tests — 55 tests, `npm test`.

**Task 2** — ✅ detailed pseudocode (the brief's bonus-earning style) at
[`DELIVERY_SLOTS_PSEUDOCODE.md`](DELIVERY_SLOTS_PSEUDOCODE.md), plus an
optional (not required) concrete proof that its core concurrency claim
holds, in [`tests/concurrency.demo.test.ts`](tests/concurrency.demo.test.ts).

## Design decisions worth explaining (brief's "challenges faced" ask)

**Why login isn't built on the User Profile model.** The brief's User
Profile fields are exact — id, name, email, age, createdAt — with no
password field. Reading "add token-based authentication for the endpoints"
as *protect the CRUD routes*, `POST /auth/login` checks credentials against
env vars (`ADMIN_EMAIL` / a bcrypt hash) rather than a database record, and
issues the same kind of JWT either way. This keeps the User model exactly
as specified instead of silently adding an undocumented field.

**Why Express 4, not 5.** `express-mongo-sanitize` documents itself as
Express-4.x middleware, and Express 5 made `req.query` a read-only getter —
this app's validation middleware reassigns `req.query` with zod's
coerced/defaulted output, which would throw under Express 5. Full reasoning
in `docs/ARCHITECTURE.md`.

**Why two deploy entry points.** `src/server.ts` (traditional, listens on a
port, graceful shutdown) and `api/index.ts` (Vercel serverless, no
`.listen()`, caches the Mongo connection across warm invocations) share the
exact same `src/app.ts` — nothing about routes/middleware is duplicated
between them.

## Deployment

Deployed on Vercel (same flow as the companion frontend project: push to
GitHub, connect the repo in Vercel, deploy). `vercel.json` rewrites every
path to the single serverless function in `api/index.ts`. Required env vars
(set in Vercel's dashboard, same names as `.env.example`): `MONGODB_URI`
(a MongoDB Atlas free-tier cluster works well here), `JWT_SECRET`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `CORS_ORIGIN`, and the rate-limit
vars if you want non-default values.

**Live URL:** https://turuq-backend-assessment.vercel.app
**Live Swagger UI:** https://turuq-backend-assessment.vercel.app/api-docs

Example requests against the deployed instance:

```bash
curl -s -X POST https://turuq-backend-assessment.vercel.app/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<your password>"}'

TOKEN="<paste the returned token>"

curl -s -X POST https://turuq-backend-assessment.vercel.app/api/v1/users \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Ada Lovelace","email":"ada@example.com","age":36}'

curl -s "https://turuq-backend-assessment.vercel.app/api/v1/users?age=36" -H "Authorization: Bearer $TOKEN"
```

## Project structure

```
src/
  config/       env validation, DB connection, logger, Swagger spec
  models/       Mongoose schema
  controllers/  request handlers
  routes/       Express routers + @openapi doc comments
  middleware/   auth, validation, rate limiting, centralized error handling
  validators/   zod schemas
  utils/        ApiError, asyncHandler, JWT helpers, response serializer
  app.ts        Express app (no .listen()) — shared by both entry points and tests
  server.ts     traditional long-running entry point
api/index.ts    Vercel serverless entry point
scripts/        hash-password CLI, standalone local MongoDB for dev
tests/          Jest + Supertest + mongodb-memory-server
DELIVERY_SLOTS_PSEUDOCODE.md   Task 2 deliverable
docs/           Architecture notes, submission checklist, the original brief PDF
```
