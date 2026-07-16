import request from "supertest";
import type { Server } from "http";

export const ADMIN_EMAIL = "admin@turuq.test";
export const ADMIN_PASSWORD = "TestPass123!";

export async function getAuthToken(server: Server): Promise<string> {
  const res = await request(server).post("/api/v1/auth/login").send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  return res.body.token as string;
}
