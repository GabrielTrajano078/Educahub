import { createContext } from "react";
import type { LoginFormValues, User } from "@/schemas/auth";

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };

export type AuthContextValue = {
  state: AuthState;
  login: (values: LoginFormValues) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
