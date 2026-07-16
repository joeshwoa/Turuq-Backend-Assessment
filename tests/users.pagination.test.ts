import request from "supertest";
import type { Server } from "http";
import { createApp } from "../src/app";
import { getAuthToken } from "./helpers";

const app = createApp();
let server: Server;
let token: string;

function auth() {
  return { Authorization: `Bearer ${token}` };
}

async function seedUsers(count: number) {
  for (let i = 0; i < count; i++) {
    await request(server)
      .post("/api/v1/users")
      .set(auth())
      .send({ name: `User ${i}`, email: `user${i}@example.com`, age: 20 + (i % 5) });
  }
}

beforeAll(async () => {
  server = app.listen(0);
  token = await getAuthToken(server);
});

afterAll((done) => {
  server.close(done);
});

describe("GET /api/v1/users — pagination & filtering", () => {
  it("returns default page 1 / limit 20 with correct meta", async () => {
    await seedUsers(25);
    const res = await request(server).get("/api/v1/users").set(auth());

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(20);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 20, total: 25, totalPages: 2 });
  });

  it("slices correctly across pages", async () => {
    await seedUsers(5);
    const page1 = await request(server).get("/api/v1/users?page=1&limit=2").set(auth());
    const page2 = await request(server).get("/api/v1/users?page=2&limit=2").set(auth());

    expect(page1.body.data).toHaveLength(2);
    expect(page2.body.data).toHaveLength(2);
    expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
    expect(page1.body.meta.totalPages).toBe(3); // ceil(5/2)
  });

  it("filters by exact age", async () => {
    await request(server).post("/api/v1/users").set(auth()).send({ name: "Exact 42", email: "exact42@example.com", age: 42 });
    await request(server).post("/api/v1/users").set(auth()).send({ name: "Exact 43", email: "exact43@example.com", age: 43 });

    const res = await request(server).get("/api/v1/users?age=42").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((u: { age: number }) => u.age === 42)).toBe(true);
  });

  it("clamps an oversized limit to the server-side max instead of honoring it", async () => {
    await seedUsers(3);
    const res = await request(server).get("/api/v1/users?limit=999999").set(auth());
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(100); // hard cap, never the requested 999999
  });

  it("rejects a non-numeric page value", async () => {
    const res = await request(server).get("/api/v1/users?page=abc").set(auth());
    expect(res.status).toBe(400);
  });
});
