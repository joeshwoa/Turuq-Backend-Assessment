export type UserDTO = {
  id: string;
  name: string;
  email: string;
  age?: number;
  createdAt: Date;
};

type LeanUserDoc = {
  _id: unknown;
  name: string;
  email: string;
  // Mongoose infers an optional Number field as `number | null` (MongoDB
  // stores "unset" as either a missing key or an explicit null), not just
  // `number | undefined` — both collapse to `undefined` in the DTO below.
  age?: number | null;
  createdAt: Date;
};

/**
 * `.lean()` queries (used everywhere for read performance — see
 * `user.model.ts`) return plain objects straight from the MongoDB driver,
 * which bypasses any Mongoose schema `toJSON` transform. Without a single,
 * explicit, allow-listed mapper like this, it's easy to accidentally leak
 * `_id`/`__v` or whatever else Mongoose happens to return in a response.
 */
export function toUserDTO(doc: LeanUserDoc): UserDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    age: doc.age ?? undefined,
    createdAt: doc.createdAt,
  };
}
