import { createUserSchema, idParamSchema, listUsersQuerySchema, updateUserSchema } from "../src/validators/user.validators";
import { loginSchema } from "../src/validators/auth.validators";

describe("createUserSchema", () => {
  it.each([0, 1, 150])("accepts boundary age values (%i)", (age) => {
    expect(createUserSchema.safeParse({ name: "X", email: "x@example.com", age }).success).toBe(true);
  });

  it.each([-1, 151])("rejects out-of-range age values (%i)", (age) => {
    expect(createUserSchema.safeParse({ name: "X", email: "x@example.com", age }).success).toBe(false);
  });

  it("lowercases and trims the email", () => {
    const result = createUserSchema.safeParse({ name: " X ", email: "  Foo@Example.COM  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("foo@example.com");
      expect(result.data.name).toBe("X");
    }
  });
});

describe("updateUserSchema", () => {
  it("rejects a completely empty object", () => {
    expect(updateUserSchema.safeParse({}).success).toBe(false);
  });

  it("accepts a single field", () => {
    expect(updateUserSchema.safeParse({ age: 25 }).success).toBe(true);
  });
});

describe("idParamSchema", () => {
  it("accepts a well-formed 24-char hex ObjectId", () => {
    expect(idParamSchema.safeParse({ id: "507f1f77bcf86cd799439011" }).success).toBe(true);
  });

  it.each(["not-an-id", "123", "", "507f1f77bcf86cd79943901"])("rejects malformed id %p", (id) => {
    expect(idParamSchema.safeParse({ id }).success).toBe(false);
  });
});

describe("listUsersQuerySchema", () => {
  it("defaults page=1 and limit=20 when omitted", () => {
    const result = listUsersQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({ page: 1, limit: 20 });
    }
  });

  it("clamps a limit above the max down to 100", () => {
    const result = listUsersQuerySchema.safeParse({ limit: "5000" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(100);
  });

  it("coerces string query values to numbers", () => {
    const result = listUsersQuerySchema.safeParse({ page: "3", age: "42" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.age).toBe(42);
    }
  });
});

describe("loginSchema", () => {
  it("rejects an object-shaped email (NoSQL-operator-injection shape)", () => {
    expect(loginSchema.safeParse({ email: { $gt: "" }, password: "x" }).success).toBe(false);
  });
});
