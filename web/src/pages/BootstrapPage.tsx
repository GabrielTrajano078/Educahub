import { useState, type SyntheticEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { bootstrapAdmin } from "@/api/auth";
import { BrandLogo } from "@/components/BrandLogo";
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
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
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
    <main className="auth-layout auth-layout--modern">
      <div className="app-canvas" aria-hidden="true" />
      <section className="auth-card auth-card--modern">
        <header className="login-header-brand">
          <div className="login-logo-wrap">
            <div className="auth-logo auth-logo--brand">
              <BrandLogo variant="auth" />
            </div>
          </div>
          <h1 className="login-screen-title">Educahub</h1>
          <p className="login-tagline">Primeiro acesso — criar administrador</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form auth-form" noValidate>
          <div
            className={`login-field-float${values.fullName.trim() ? " login-field-float--filled" : ""}`}
          >
            <input
              id="bootstrap-fullname"
              className="login-field-float-input"
              type="text"
              autoComplete="name"
              placeholder=" "
              value={values.fullName}
              onChange={(e) => setValues((v) => ({ ...v, fullName: e.target.value }))}
            />
            <label className="login-field-float-label" htmlFor="bootstrap-fullname">
              Nome completo
            </label>
          </div>

          <div
            className={`login-field-float${values.email.trim() ? " login-field-float--filled" : ""}`}
          >
            <input
              id="bootstrap-email"
              className="login-field-float-input"
              type="email"
              autoComplete="username"
              placeholder=" "
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            <label className="login-field-float-label" htmlFor="bootstrap-email">
              E-mail
            </label>
          </div>

          <div
            className={`login-field-float${values.password.length > 0 ? " login-field-float--filled" : ""}`}
          >
            <input
              id="bootstrap-password"
              className="login-field-float-input login-field-float-input--toggle"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder=" "
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
            <label className="login-field-float-label" htmlFor="bootstrap-password">
              Senha
            </label>
            <button
              type="button"
              className="login-password-toggle"
              aria-label={showPassword ? "Ocultar texto digitado" : "Exibir texto digitado"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
            </button>
          </div>

          {error ? (
            <p className="error auth-error login-inline-error" role="alert">
              {error}
            </p>
          ) : null}
          {success ? (
            <output className="success" aria-live="polite">
              {success}
            </output>
          ) : null}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Criando…" : "Criar administrador"}
          </button>
        </form>

        <div className="login-footer-links">
          <span
            className="login-link-accent login-link-accent--disabled"
            title="Disponível somente quando ainda não existem usuários na base."
          >
            Sem usuários na base
          </span>
          <span className="login-footer-dot" aria-hidden="true">
            ·
          </span>
          <Link className="login-link-secondary" to="/login">
            Voltar ao login
          </Link>
        </div>
      </section>
    </main>
  );
}

function EyeIcon() {
  return (
    <svg
      className="login-password-toggle-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeSlashIcon() {
  return (
    <svg
      className="login-password-toggle-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
