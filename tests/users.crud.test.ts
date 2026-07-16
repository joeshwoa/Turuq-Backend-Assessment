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

describe("Users CRUD", () => {
  it("rejects every /users endpoint without a token", async () => {
    const [create, list, getOne, update, del] = await Promise.all([
      request(server).post("/api/v1/users").send({ name: "Ada", email: "ada@example.com" }),
      request(server).get("/api/v1/users"),
      request(server).get("/api/v1/users/507f1f77bcf86cd799439011"),
      request(server).put("/api/v1/users/507f1f77bcf86cd799439011").send({ name: "x" }),
      request(server).delete("/api/v1/users/507f1f77bcf86cd799439011"),
    ]);
    for (const res of [create, list, getOne, update, del]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    }
  });

  it("creates a user and never leaks _id/__v in the response", async () => {
    const res = await request(server)
      .post("/api/v1/users")
      .set(auth())
      .send({ name: "Ada Lovelace", email: "ada@example.com", age: 36 });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: "Ada Lovelace", email: "ada@example.com", age: 36 });
    expect(typeof res.body.data.id).toBe("string");
    expect(res.body.data._id).toBeUndefined();
    expect(res.body.data.__v).toBeUndefined();
    expect(res.body.data.createdAt).toBeDefined();
  });

  it("rejects creating a second user with the same email (409)", async () => {
    await request(server).post("/api/v1/users").set(auth()).send({ name: "Ada", email: "dup@example.com" });
    const res = await request(server).post("/api/v1/users").set(auth()).send({ name: "Someone Else", email: "dup@example.com" });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
  });

  it("fetches a user by id", async () => {
    const created = await request(server).post("/api/v1/users").set(auth()).send({ name: "Grace Hopper", email: "grace@example.com" });
    const id = created.body.data.id;

    const res = await request(server).get(`/api/v1/users/${id}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe("grace@example.com");
  });

  it("returns 400 INVALID_ID (not 500) for a malformed id, and 404 for a well-formed but missing one", async () => {
    const malformed = await request(server).get("/api/v1/users/not-a-valid-object-id").set(auth());
    expect(malformed.status).toBe(400);
    expect(malformed.body.error.code).toBe("INVALID_ID");

    const missing = await request(server).get("/api/v1/users/507f1f77bcf86cd799439099").set(auth());
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe("NOT_FOUND");
  });

  it("updates a user (partial update)", async () => {
    const created = await request(server).post("/api/v1/users").set(auth()).send({ name: "Margaret Hamilton", email: "margaret@example.com", age: 40 });
    const id = created.body.data.id;

    const res = await request(server).put(`/api/v1/users/${id}`).set(auth()).send({ age: 41 });
    expect(res.status).toBe(200);
    expect(res.body.data.age).toBe(41);
    expect(res.body.data.name).toBe("Margaret Hamilton"); // untouched field survives a partial update
  });

  it("rejects an empty update body", async () => {
    const created = await request(server).post("/api/v1/users").set(auth()).send({ name: "Empty Body Test", email: "empty@example.com" });
    const res = await request(server).put(`/api/v1/users/${created.body.data.id}`).set(auth()).send({});
    expect(res.status).toBe(400);
  });

  it("rejects updating a user's email to one already used by someone else (409)", async () => {
    await request(server).post("/api/v1/users").set(auth()).send({ name: "First", email: "first@example.com" });
    const second = await request(server).post("/api/v1/users").set(auth()).send({ name: "Second", email: "second@example.com" });

    const res = await request(server).put(`/api/v1/users/${second.body.data.id}`).set(auth()).send({ email: "first@example.com" });
    expect(res.status).toBe(409);
  });

  it("returns 404 updating a well-formed but nonexistent id", async () => {
    const res = await request(server).put("/api/v1/users/507f1f77bcf86cd799439099").set(auth()).send({ age: 20 });
    expect(res.status).toBe(404);
  });

  it("deletes a user, then 404s on a repeat get/delete", async () => {
    const created = await request(server).post("/api/v1/users").set(auth()).send({ name: "To Delete", email: "delete-me@example.com" });
    const id = created.body.data.id;

    const del = await request(server).delete(`/api/v1/users/${id}`).set(auth());
    expect(del.status).toBe(200);
    expect(del.body.id).toBe(id);

    const getAfter = await request(server).get(`/api/v1/users/${id}`).set(auth());
    expect(getAfter.status).toBe(404);

    const delAgain = await request(server).delete(`/api/v1/users/${id}`).set(auth());
    expect(delAgain.status).toBe(404);
  });
});
