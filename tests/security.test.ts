import request from "supertest";
import jwt from "jsonwebtoken";
import type { Server } from "http";
import { createApp } from "../src/app";
import { getAuthToken } from "./helpers";

const app = createApp();
let server: Server;
let token: string;

beforeAll(async () => {
  server = app.listen(0);
  token = await getAuthToken(server);
});

afterAll((done) => {
  server.close(done);
});

function auth() {
  return { Authorization: `Bearer ${token}` };
}

describe("Security", () => {
  it("rejects a NoSQL-operator-shaped email in the request body before it reaches Mongoose", async () => {
    const res = await request(server)
      .post("/api/v1/users")
      .set(auth())
      .send({ name: "Attacker", email: { $gt: "" }, age: 30 });

    // zod's z.string().email() rejects a non-string value outright — the
    // malicious operator object never becomes part of a Mongoose query.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a NoSQL-operator-shaped age filter in the query string", async () => {
    // Express's query parser turns `age[$gt]=0` into `{ age: { $gt: '0' } }`.
    const res = await request(server).get("/api/v1/users").query("age[$gt]=0").set(auth());
    expect(res.status).toBe(400);
  });

  it("rejects an oversized request body (413), never reaching a handler", async () => {
    const res = await request(server)
      .post("/api/v1/users")
      .set(auth())
      .send({ name: "x".repeat(20_000), email: "big@example.com" });

    expect(res.status).toBe(413);
  });

  it("rejects a request with no Authorization header at all", async () => {
    const res = await request(server).get("/api/v1/users");
    expect(res.status).toBe(401);
  });

  it("rejects a malformed Bearer token", async () => {
    const res = await request(server).get("/api/v1/users").set({ Authorization: "Bearer not-a-real-token" });
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const forged = jwt.sign({ sub: "admin@turuq.test", role: "admin" }, "a-completely-different-secret");
    const res = await request(server).get("/api/v1/users").set({ Authorization: `Bearer ${forged}` });
    expect(res.status).toBe(401);
  });
});
