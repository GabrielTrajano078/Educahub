import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser, UserRole } from "../types/auth";

const ROLES: UserRole[] = ["admin", "professor", "coordenador", "gestor"];

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ message: "Token nao informado." });
    return;
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser & Record<string, unknown>;
    if (!ROLES.includes(payload.role as UserRole)) {
      res.status(401).json({ message: "Token invalido." });
      return;
    }

    const rawClassrooms = payload.classroomIds;
    const classroomIds = Array.isArray(rawClassrooms)
      ? rawClassrooms.map((id) => String(id))
      : [];

    req.user = {
      id: String(payload.id),
      role: payload.role as UserRole,
      schoolId: payload.schoolId ?? null,
      municipalityCode: payload.municipalityCode ?? null,
      classroomIds,
    };
    next();
  } catch {
    res.status(401).json({ message: "Token invalido ou expirado." });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Usuario nao autenticado." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: "Acesso negado para este perfil." });
      return;
    }

    next();
  };
}
