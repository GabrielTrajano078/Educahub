import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { bootstrapAdmin } from "@/api/auth";
import { ApiError } from "@/lib/api-client";
import { bootstrapFormSchema, type BootstrapFormValues } from "@/schemas/auth";

export function BootstrapPage() {
  const navigate = useNavigate();
  const [values, setValues] = useState<BootstrapFormValues>({
    fullName: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = bootstrapFormSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Dados inválidos.");
      return;
    }
    setSubmitting(true);
    try {
      await bootstrapAdmin(parsed.data);
      setSuccess("Administrador criado. Faça login com o e-mail e a senha informados.");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Falha ao criar administrador.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="card">
        <h1>Criar administrador</h1>
        <p className="muted">Disponível apenas quando ainda não existem usuários na base.</p>
        <form onSubmit={handleSubmit} className="stack">
          <label className="field">
            <span>Nome completo</span>
            <input
              value={values.fullName}
              onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
              required
            />
          </label>
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
              autoComplete="new-password"
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
              required
              minLength={6}
            />
          </label>
          {error ? (
            <p className="error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="success" role="status">
              {success}
            </p>
          ) : null}
          <button type="submit" className="primary" disabled={submitting}>
            {submitting ? "Criando…" : "Criar administrador"}
          </button>
        </form>
        <p className="muted small">
          <Link to="/login">Voltar ao login</Link>
        </p>
      </section>
    </main>
  );
}
