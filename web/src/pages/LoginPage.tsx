import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { loginFormSchema, type LoginFormValues } from "@/schemas/auth";

export function LoginPage() {
  const { state, login } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === "loading") {
    return (
      <main className="auth-layout">
        <output className="card muted" aria-live="polite">
          Carregando sessão…
        </output>
      </main>
    );
  }

  if (state.status === "authenticated") {
    return <Navigate to={from === "/login" ? "/" : from} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setSubmitting(true);
    try {
      await login(parsed.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Não foi possível entrar. Tente novamente.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="card">
        <h1>Entrar</h1>
        <p className="muted">API SAEB / SPA-S — diagnóstico</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              autoComplete="username"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              required
            />
          </label>
          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              required
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="muted small">
          <Link to="/bootstrap">Primeiro acesso — criar administrador</Link>
        </p>
      </section>
    </main>
  );
}
