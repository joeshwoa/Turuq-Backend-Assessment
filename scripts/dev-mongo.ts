import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Standalone local MongoDB for manual development/verification — no Docker,
 * no system mongod install, no Atlas account needed. Run this in one
 * terminal, paste the printed URI into .env's MONGODB_URI, then run
 * `npm run dev` in a second terminal against it. Leave this process running
 * for as long as you want the data to persist across requests; killing it
 * (Ctrl+C) tears the in-memory database down.
 *
 * This is a dev convenience only — the Jest test suite manages its own
 * separate instances per test file (see tests/setup.ts) and does not use
 * this script at all.
 */
async function main() {
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  console.log("\nLocal MongoDB is running.");
  console.log(`MONGODB_URI=${uri}\n`);
  console.log("Paste the line above into backend/.env, then run `npm run dev` in another terminal.");
  console.log("Press Ctrl+C here to stop this database.\n");

  const shutdown = async () => {
    console.log("\nStopping local MongoDB…");
    await mongod.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Failed to start local MongoDB:", err);
  process.exit(1);
});
