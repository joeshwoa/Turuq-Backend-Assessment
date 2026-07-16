import dotenv from "dotenv";
import path from "path";

// Runs before the test framework itself is set up (Jest's `setupFiles`),
// which matters because it must happen before any test file's first
// `import` of `src/app.ts` — that import chain reaches `config/env.ts`,
// whose zod parse of `process.env` runs immediately at import time.
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });
