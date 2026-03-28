import { apiFetch } from "@/lib/api-client";
import { authResponseSchema, type BootstrapFormValues, type LoginFormValues, userSchema, type User } from "@/schemas/auth";

export async function login(body: LoginFormValues) {
  const data = await apiFetch<unknown>("/api/auth/login", { method: "POST", body });
  return authResponseSchema.parse(data);
}

export async function bootstrapAdmin(body: BootstrapFormValues) {
  return apiFetch<{ id: string }>("/api/auth/bootstrap-admin", { method: "POST", body });
}

export async function fetchMe(): Promise<User> {
  const data = await apiFetch<unknown>("/api/auth/me");
  return userSchema.parse(data);
}
