export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_REFRESH_TOKEN_MISSING"
  | "AUTH_REFRESH_TOKEN_INVALID"
  | "AUTH_REFRESH_TOKEN_REVOKED"
  | "AUTH_LOGIN_LOCKED"
  | "MCT_CASE_NOT_FOUND"
  | "MCT_TRANSITION_INVALID"
  | "MCT_TRANSITION_FORBIDDEN"
  | "MCT_CORPER_PROFILE_NOT_FOUND"
  | "MCT_DOCTOR_PROFILE_NOT_FOUND"
  | "MCT_ACTIVE_CASE_EXISTS"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  statusCode: number;
  code: AppErrorCode;

  constructor(message: string, statusCode: number, code: AppErrorCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
