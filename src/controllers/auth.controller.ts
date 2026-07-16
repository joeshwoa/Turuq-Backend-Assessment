import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { signToken } from "../utils/jwt";
import { env } from "../config/env";
import type { LoginInput } from "../validators/auth.validators";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const isEmailMatch = email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  // Always run bcrypt.compare, even against a known-wrong email, so the
  // response time doesn't leak whether an email exists (a real password
  // hash compare and a constant-shaped rejection both take the same time).
  const isPasswordMatch = await bcrypt.compare(password, env.ADMIN_PASSWORD_HASH);

  if (!isEmailMatch || !isPasswordMatch) {
    // Same generic message either way — no user enumeration.
    throw ApiError.unauthorized();
  }

  const token = signToken({ sub: env.ADMIN_EMAIL, role: "admin" });
  res.status(200).json({ token, expiresIn: env.JWT_EXPIRES_IN });
});
