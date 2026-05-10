import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { loginFormSchema, type LoginFormValues } from "@/schemas/auth";

export function LoginPage() {
  const { state, login } = useAuth();

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (state.status === "loading") {
    return (
      <main className="auth-layout">
        <div className="app-canvas" aria-hidden="true" />
        <output className="auth-card auth-card--loading muted" aria-live="polite">
          Carregando sessão…
        </output>
      </main>
    );
  }

  if (state.status === "authenticated") {
    return <Navigate to="/" replace />;
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
      <div className="app-canvas" aria-hidden="true" />
      <section className="auth-card">
        <header className="auth-card-header">
          <div className="auth-logo auth-logo--brand">
            <BrandLogo variant="auth" />
          </div>
          <div className="auth-card-titles">
            <h1>Entrar</h1>
            <p className="auth-subtitle">Painel de diagnóstico · matriz SAEB</p>
          </div>
        </header>
        <form onSubmit={handleSubmit} className="stack auth-form">
          <label className="field">
            <span className="field-label">E-mail</span>
            <input
              type="email"
              autoComplete="username"
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
              required
              placeholder="seu@email.com"
            />
          </label>
          <label className="field">
            <span className="field-label">Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              required
              placeholder="••••••••"
            />
          </label>
          {error ? (
            <p className="error auth-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="primary auth-submit" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>
        <p className="auth-footer-link">
          <Link to="/bootstrap">Primeiro acesso — criar administrador</Link>
        </p>
      </section>
    </main>
  );
}
