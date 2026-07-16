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

describe("POST /api/v1/auth/login — rate limiting", () => {
  it(
    "eventually rate-limits repeated login attempts",
    async () => {
      // AUTH_RATE_LIMIT_MAX is 10 in .env.test. Kept in its own file so no
      // other test's login calls share this limiter's state (a module-level
      // singleton for the whole file) and risk tripping — or being tripped
      // by — this one. Each attempt is a real bcrypt compare (intentionally
      // slow, cost factor 12, and slower still on constrained/virtualized
      // hardware), hence keeping the threshold low and the request count
      // bounded rather than relying on a longer timeout to paper over it.
      let lastStatus = 0;
      for (let i = 0; i < 15; i++) {
        const res = await request(server)
          .post("/api/v1/auth/login")
          .send({ email: "admin@turuq.test", password: "wrong-password" });
        lastStatus = res.status;
        if (lastStatus === 429) break;
      }
      expect(lastStatus).toBe(429);
    },
    30_000
  );
});
