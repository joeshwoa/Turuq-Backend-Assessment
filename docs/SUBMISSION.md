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
- [x] Swagger API docs wired up at `/api-docs`.
- [x] Documentation written (`README.md`, `docs/ARCHITECTURE.md`, this file).
- [x] Manual smoke test against a running dev server (curl, all 5
      endpoints + auth + error cases) and the Swagger UI itself, both
      confirmed working.

## What's left (requires your go-ahead — nothing below happens automatically)

1. **Push to GitHub.** Local repo prepared with the remote set to the URL
   you provided: `https://github.com/joeshwoa/Turuq-Backend-Assessment.git`

   ```bash
   git push -u origin main
   ```

2. **Deploy on Vercel** (same flow as the frontend): connect this repo in
   the Vercel dashboard, set the environment variables listed in
   `.env.example` (you'll need a MongoDB Atlas connection string — the free
   M0 tier doesn't require a card, unlike what you ran into with Render),
   deploy, then share the resulting URL back so it can be verified live
   (login, one CRUD call, and `/api-docs`) and pasted into the README's
   "Live URL" line and the submission email.

3. **Review the Gmail draft** once prepared (ask, and it'll be created —
   not sent — the same way the frontend one was): `turuq.hr@gmail.com`,
   subject exactly **"Backend Assessment"** (note: different subject than
   the frontend's "Frontend Assessment" — these are two separate emails
   per the brief), with the GitHub link and, once available, the live URL.

4. **Double-check the subject line** matches the brief exactly before
   sending — it's easy to get subtly wrong.

## If you'd rather submit a ZIP instead of GitHub

```bash
cd "/Volumes/PortableSSD/Projects/Next/Frontend Assessment/backend"
zip -r ../turuq-backend-assessment.zip . -x "node_modules/*" "dist/*" ".git/*"
```

Upload to Google Drive, set link sharing to "Anyone with the link," and use
that link in the email instead of the GitHub URL.
