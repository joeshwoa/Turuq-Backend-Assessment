# Submission checklist

## Deadline

Correction from an earlier version of this file: the backend task is **not**
on the frontend's original deadline clock. Mariam Tosson (Turuq HR) sent a
clarification in the same Gmail thread ("Frontend Assessment") stating the
backend task is "the second and final part of Stage Two" and that the usual
**2 days from receipt** applies starting from *that* message, sent the
morning of **2026-07-16**. That puts the deadline at approximately
**2026-07-18**, i.e. around now — submit as soon as the reply draft below is
reviewed and sent.

## What's done — everything, fully verified live (not just locally)

- [x] Full CRUD API (Task 1) built, tested (55 tests, `npm test`), linted,
      type-checked, and production-build-verified.
- [x] Task 2 pseudocode written — `DELIVERY_SLOTS_PSEUDOCODE.md` (detailed
      style, for the bonus points).
- [x] Security & performance measures implemented and each one covered by
      a test (see `docs/ARCHITECTURE.md`'s table).
- [x] Swagger API docs live at `/api-docs`, server dropdown defaulting to
      the deployed URL so anyone can "Try it out" against production with
      no local setup — confirmed rendering and working in a real browser.
- [x] Documentation written (`README.md`, `docs/ARCHITECTURE.md`, this file).
- [x] Pushed to GitHub: `https://github.com/joeshwoa/Turuq-Backend-Assessment.git`
- [x] Deployed on Vercel: `https://turuq-backend-assessment.vercel.app`
      (project: `turuq-backend-assessment`). MongoDB Atlas connection reuses
      the existing "joDB" cluster with a new, dedicated database user
      (`turuq-backend-app`) and a new database name
      (`turuq-backend-assessment`) — the pre-existing data/users in that
      cluster were left untouched.
- [x] **Live deployment fully tested end-to-end** (curl against the actual
      production URL, not localhost): health check, login, create, list
      with pagination + age filter, get by id, update, delete, duplicate
      email (409), missing field (400), malformed id (400), not-found id
      (404), no-token (401) — every case passed.

Three real deployment bugs were found and fixed along the way (all in the
git history): a Vercel serverless function needs `functions.includeFiles` in
`vercel.json` to bundle files read at runtime via glob/`fs` rather than
`import`/`require` — this bit both the Swagger route-doc scanner and
`swagger-ui-express`'s static assets; and a database password containing an
unencoded special character broke `mongodb+srv://` URI parsing, fixed by
passing credentials via Mongoose's separate `auth` option instead of
embedding them in the connection string.

## What's left (requires your go-ahead — nothing below happens automatically)

1. **Review the Gmail draft** once prepared — a reply within the existing
   "Frontend Assessment" thread (per Mariam's clarification, the backend
   task belongs in that same thread, not a new email) with the GitHub link
   and the live URL.
2. Send it whenever you're ready — given the deadline above, sooner is
   better.

## If you'd rather submit a ZIP instead of GitHub

```bash
cd "/Volumes/PortableSSD/Projects/Next/Frontend Assessment/backend"
zip -r ../turuq-backend-assessment.zip . -x "node_modules/*" "dist/*" ".git/*"
```

Upload to Google Drive, set link sharing to "Anyone with the link," and use
that link in the email instead of the GitHub URL.
