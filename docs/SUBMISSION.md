# Submission checklist

## Deadline

Same engagement as the frontend assessment — the original email arrived
**2026-07-15 05:00 UTC**, 48 hours from receipt: **2026-07-17 05:00 UTC**
(≈ 2026-07-17 08:00 Cairo time, EEST/UTC+3 — double-check against your own
clock/timezone). This is a **separate submission** from the frontend one,
with its own subject line — see below.

## What's done

- [x] Full CRUD API (Task 1) built, tested (55 tests, `npm test`), linted,
      type-checked, and production-build-verified.
- [x] Task 2 pseudocode written — `DELIVERY_SLOTS_PSEUDOCODE.md` (detailed
      style, for the bonus points).
- [x] Security & performance measures implemented and each one covered by
      a test (see `docs/ARCHITECTURE.md`'s table).
- [x] Swagger API docs wired up at `/api-docs`, server dropdown pointed at
      the live Vercel URL so anyone can "Try it out" against production
      directly, no local setup needed.
- [x] Documentation written (`README.md`, `docs/ARCHITECTURE.md`, this file).
- [x] Manual smoke test against a running dev server (curl, all 5
      endpoints + auth + error cases) and the Swagger UI itself, both
      confirmed working.
- [x] Pushed to GitHub: `https://github.com/joeshwoa/Turuq-Backend-Assessment.git`
- [x] Deployed on Vercel: `https://turuq-backend-assessment.vercel.app`
      (project: `turuq-backend-assessment` under joeshwoa's Vercel account).
      MongoDB Atlas connection reuses the existing "joDB" cluster with a new,
      dedicated database user (`turuq-backend-app`) and a new database name
      (`turuq-backend-assessment`) — the pre-existing data/user in that
      cluster was left untouched.

## What's left (requires your go-ahead — nothing below happens automatically)

1. **Finish the `MONGODB_URI` environment variable in Vercel.** Every other
   env var (`JWT_SECRET`, `JWT_EXPIRES_IN`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD_HASH`, `CORS_ORIGIN`, `NODE_ENV`) is filled in; this one
   needs your Atlas database password pasted in by hand (browser automation
   can't safely do this step — see the note left in the open Vercel tab),
   then click **Save** to trigger a redeploy.
2. Once redeployed, this file and the README's "Live URL" section will be
   verified against the live deployment (health check, login, full CRUD,
   error cases, and the live Swagger UI) and reported back.
3. **Review the Gmail draft** once prepared (a reply within the existing
   "Backend Assessment" thread — not sent, same as the frontend one) with
   the GitHub link and the live URL.
4. **Double-check the subject line** matches the brief exactly before
   sending — it's easy to get subtly wrong.

## If you'd rather submit a ZIP instead of GitHub

```bash
cd "/Volumes/PortableSSD/Projects/Next/Frontend Assessment/backend"
zip -r ../turuq-backend-assessment.zip . -x "node_modules/*" "dist/*" ".git/*"
```

Upload to Google Drive, set link sharing to "Anyone with the link," and use
that link in the email instead of the GitHub URL.
