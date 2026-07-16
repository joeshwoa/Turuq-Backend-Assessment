import request from "supertest";
import type { Server } from "http";
import { createApp } from "../src/app";

const app = createApp();
const ADMIN_EMAIL = "admin@turuq.test";
const ADMIN_PASSWORD = "TestPass123!";
let server: Server;

beforeAll(() => {
  server = app.listen(0);
});

afterAll((done) => {
  server.close(done);
});

describe("POST /api/v1/auth/login", () => {
  it("issues a JWT for correct credentials", async () => {
    const res = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".")).toHaveLength(3); // header.payload.signature
    expect(res.body.expiresIn).toBe("1h");
  });

  it("rejects a wrong password with a generic message", async () => {
    const res = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: ADMIN_EMAIL, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
    expect(res.body.error.message).toBe("Invalid credentials");
  });

  it("rejects an unknown email with the SAME generic message (no user enumeration)", async () => {
    const res = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@turuq.test", password: ADMIN_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid credentials");
  });

  it("rejects a request missing the password field", async () => {
    const res = await request(server).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects a malformed email format", async () => {
    const res = await request(server)
      .post("/api/v1/auth/login")
      .send({ email: "not-an-email", password: ADMIN_PASSWORD });
    expect(res.status).toBe(400);
  });
});

// The rate-limit-tripping test lives in its own file (auth.ratelimit.test.ts)
// deliberately: it needs to fire enough requests to exceed AUTH_RATE_LIMIT_MAX,
// and rate-limiter state is a module-level singleton shared by every test
// *within* one file — keeping it separate means the handful of functional
// login tests above never risk tripping it (or vice versa).
