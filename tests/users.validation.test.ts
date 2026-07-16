import request from "supertest";
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

describe("User validation", () => {
  it("rejects a missing name", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ email: "noname@example.com" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a missing email", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "No Email" });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email format", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "Bad Email", email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rejects a negative age", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "X", email: "negage@example.com", age: -1 });
    expect(res.status).toBe(400);
  });

  it("rejects a non-integer age", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "X", email: "floatage@example.com", age: 30.5 });
    expect(res.status).toBe(400);
  });

  it("rejects an unrealistic age", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "X", email: "oldage@example.com", age: 999 });
    expect(res.status).toBe(400);
  });

  it("rejects a name over 100 characters", async () => {
    const res = await request(server)
      .post("/api/v1/users")
      .set(auth())
      .send({ name: "a".repeat(101), email: "longname@example.com" });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown extra field (.strict())", async () => {
    const res = await request(server)
      .post("/api/v1/users")
      .set(auth())
      .send({ name: "X", email: "extra@example.com", isAdmin: true });
    expect(res.status).toBe(400);
  });

  it("accepts age omitted entirely (it's optional)", async () => {
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "No Age", email: "noage@example.com" });
    expect(res.status).toBe(201);
    expect(res.body.data.age).toBeUndefined();
  });
});
