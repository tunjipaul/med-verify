import { Role } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

type AuthJwtPayload = {
  sub: string;
  role: Role;
  email: string;
};

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return next(new AppError("Unauthorized: Missing token", 401, "UNAUTHORIZED"));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AuthJwtPayload;
    req.user = { id: decoded.sub, role: decoded.role, email: decoded.email };
    return next();
  } catch {
    return next(new AppError("Unauthorized: Invalid token", 401, "UNAUTHORIZED"));
  }
}

export function requireRoles(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError("Unauthorized", 401, "UNAUTHORIZED"));
    }

    if (!allowed.includes(req.user.role)) {
      return next(new AppError("Forbidden", 403, "FORBIDDEN"));
    }

    return next();
  };
}
