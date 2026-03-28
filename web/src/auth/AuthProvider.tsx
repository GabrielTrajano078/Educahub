import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { fetchMe, login as loginRequest } from "@/api/auth";
import { getStoredToken, setStoredToken } from "@/lib/api-client";
import type { LoginFormValues } from "@/schemas/auth";
import { AuthContext, type AuthContextValue, type AuthState } from "./context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    getStoredToken() ? { status: "loading" } : { status: "anonymous" },
  );

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setState({ status: "anonymous" });
      return;
    }
    try {
      const user = await fetchMe();
      setState({ status: "authenticated", user });
    } catch {
      setStoredToken(null);
      setState({ status: "anonymous" });
    }
  }, []);

  const login = useCallback(async (values: LoginFormValues) => {
    const { token, user } = await loginRequest(values);
    setStoredToken(token);
    setState({ status: "authenticated", user });
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setState({ status: "anonymous" });
  }, []);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const user = await fetchMe();
        if (!cancelled) {
          setState({ status: "authenticated", user });
        }
      } catch {
        if (!cancelled) {
          setStoredToken(null);
          setState({ status: "anonymous" });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      login,
      logout,
      refreshUser,
    }),
    [state, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
