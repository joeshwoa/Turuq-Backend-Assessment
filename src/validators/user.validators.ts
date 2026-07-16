import { z } from "zod";
import { isValidObjectId } from "mongoose";

const name = z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters");
const email = z.string().trim().toLowerCase().email("Invalid email format");
const age = z.coerce.number().int("Age must be an integer").min(0, "Age cannot be negative").max(150, "Age must be realistic");

export const createUserSchema = z
  .object({
    name,
    email,
    age: age.optional(),
  })
  .strict();

export const updateUserSchema = z
  .object({
    name: name.optional(),
    email: email.optional(),
    age: age.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field (name, email, age) must be provided",
  });

export const idParamSchema = z.object({
  id: z.string().refine((val) => isValidObjectId(val), { message: "Invalid id format" }),
});

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  // Clamped, not rejected — a client asking for too much gets the max page
  // size back rather than an error, but the server-side cap is never
  // bypassed no matter what a client requests.
  limit: z.coerce.number().int().min(1).max(1_000_000).default(DEFAULT_LIMIT).transform((val) => Math.min(val, MAX_LIMIT)),
  age: z.coerce.number().int().min(0).max(150).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
