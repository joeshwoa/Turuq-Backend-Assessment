import type { Request, Response } from "express";
import { User } from "../models/user.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { toUserDTO } from "../utils/serializers";
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from "../validators/user.validators";

export const createUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, age } = req.body as CreateUserInput;
  // Uniqueness is enforced authoritatively by the schema's unique index —
  // a duplicate insert throws a Mongo E11000 error, caught centrally by
  // error.middleware.ts and turned into 409 DUPLICATE_EMAIL. This closes
  // the race an app-level "check then insert" pre-check would leave open.
  const user = await User.create({ name, email, age });
  res.status(201).json({ data: toUserDTO(user.toObject()) });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, age } = req.query as unknown as ListUsersQuery;

  const filter: Record<string, unknown> = {};
  if (age !== undefined) filter.age = age;

  const skip = (page - 1) * limit;

  // Run the page fetch and the count in parallel — same round trip either
  // way, half the latency. `.lean()` skips Mongoose document hydration
  // entirely on the read path, which is the single biggest per-request
  // cost difference at high list-endpoint traffic.
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    data: items.map(toUserDTO),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  });
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findById(id).lean();
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ data: toUserDTO(user) });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body as UpdateUserInput;
  const user = await User.findByIdAndUpdate(id, updates, { returnDocument: "after", runValidators: true }).lean();
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ data: toUserDTO(user) });
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await User.findByIdAndDelete(id).lean();
  if (!user) throw ApiError.notFound("User not found");
  res.status(200).json({ message: "User deleted", id });
});
