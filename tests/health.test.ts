import request from "supertest";
import type { Server } from "http";
import { createApp } from "../src/app";

const app = createApp();
let server: Server;

beforeAll(() => {
  server = app.listen(0);
});

afterAll((done) => {
  server.close(done);
});

describe("GET /health", () => {
  it("returns ok without requiring authentication", async () => {
    const res = await request(server).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
