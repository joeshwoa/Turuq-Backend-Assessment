import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type JwtPayload = {
  sub: string;
  role: "admin";
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): JwtPayload {
  // Throws (JsonWebTokenError / TokenExpiredError) on anything invalid —
  // the caller (auth middleware) is responsible for turning that into a 401.
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}
