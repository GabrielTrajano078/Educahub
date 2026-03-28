import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { User } from "@/schemas/auth";

export function RoleRoute({
  allow,
  children,
}: {
  allow: User["role"][];
  children: ReactNode;
}) {
  const { state } = useAuth();
  if (state.status !== "authenticated") {
    return null;
  }
  if (!allow.includes(state.user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
}
