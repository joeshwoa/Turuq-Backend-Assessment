import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

/**
 * Jest's `setupFilesAfterEnv` runs once per test *file* (each file gets its
 * own module registry and Jest environment), so the `beforeAll`/`afterAll`
 * below spin up one throwaway MongoDB per file — real MongoDB semantics
 * (including atomic per-document writes), zero shared state between files,
 * no Docker or system mongod install required.
 */
let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
