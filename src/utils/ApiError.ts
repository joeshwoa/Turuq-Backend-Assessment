export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_ID"
  | "NOT_FOUND"
  | "DUPLICATE_EMAIL"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

/**
 * A single error shape thrown anywhere in the app (controllers,
 * middleware) and caught once, centrally, by `error.middleware.ts`. This
 * is what lets every endpoint return the same
 * `{ error: { code, message, details? } }` body instead of each handler
 * improvising its own error format.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }

  static invalidId(message = "Invalid id format") {
    return new ApiError(400, "INVALID_ID", message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }

  static duplicateEmail(message = "Email already in use") {
    return new ApiError(409, "DUPLICATE_EMAIL", message);
  }

  static unauthorized(message = "Invalid credentials") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
}
