import { Schema, model, type InferSchemaType } from "mongoose";

/**
 * Fields match the brief exactly: ID (auto), Name (required), Email
 * (unique, required), Age (optional), CreatedAt (auto). There is
 * deliberately no `updatedAt` — the brief's field list is exact, so adding
 * one would be scope creep dressed up as a "nice to have."
 */
const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name must be at most 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },
    age: {
      type: Number,
      min: [0, "Age cannot be negative"],
      max: [150, "Age must be realistic"],
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

// email already gets a unique index from `unique: true` above; the two
// below are what actually make GET /users fast at any collection size —
// exact-match filtering by age, and the default createdAt-descending sort.
userSchema.index({ age: 1 });
userSchema.index({ createdAt: -1 });

export type UserDocument = InferSchemaType<typeof userSchema>;
export const User = model("User", userSchema);
