import { useEffect, useState, type SyntheticEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/auth/useAuth";
import { ApiError } from "@/lib/api-client";
import { loginFormSchema, type LoginFormValues } from "@/schemas/auth";

const REMEMBER_KEY = "saeb_spas_remember_me";

export function LoginPage() {
  const { state, login } = useAuth();

  const [values, setValues] = useState<LoginFormValues>({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem(REMEMBER_KEY) === "1");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    localStorage.setItem(REMEMBER_KEY, rememberMe ? "1" : "0");
  }, [rememberMe]);

  if (state.status === "loading") {
    return (
      <main className="auth-layout auth-layout--modern">
        <div className="app-canvas" aria-hidden="true" />
        <output className="auth-card auth-card--modern auth-card--loading login-loading" aria-live="polite">
          Carregando sessão…
        </output>
      </main>
    );
  }

  if (state.status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
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
          <p className="login-tagline">Painel de diagnóstico · matriz SAEB</p>
        </header>

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          <div
            className={`login-field-float${values.email.trim() ? " login-field-float--filled" : ""}`}
          >
            <input
              id="login-email"
              className="login-field-float-input"
              type="email"
              autoComplete="username"
              placeholder=" "
              value={values.email}
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
            />
            <label className="login-field-float-label" htmlFor="login-email">
              E-mail
            </label>
          </div>

          <div
            className={`login-field-float${values.password.length > 0 ? " login-field-float--filled" : ""}`}
          >
            <input
              id="login-password"
              className="login-field-float-input login-field-float-input--toggle"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder=" "
              value={values.password}
              onChange={(e) => setValues((v) => ({ ...v, password: e.target.value }))}
            />
            <label className="login-field-float-label" htmlFor="login-password">
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

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <span>Lembrar de mim</span>
          </label>

          {error ? (
            <p className="error auth-error login-inline-error" role="alert">
              {error}
            </p>
          ) : null}

          <button type="submit" className="login-submit" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <div className="login-footer-links">
          <span className="login-link-accent login-link-accent--disabled" title="Recuperação de senha em breve">
            Esqueceu a senha?
          </span>
          <span className="login-footer-dot" aria-hidden="true">
            ·
          </span>
          <Link className="login-link-secondary" to="/signup">
            Primeiro acesso — criar administrador
          </Link>
        </div>
      </section>
    </main>
  );
}

const LOGIN_EYE_PATH_D =
  "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z";
const LOGIN_EYE_SLASH_PATH_D =
  "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24";

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
      <path d={LOGIN_EYE_PATH_D} />
      <circle cx={12} cy={12} r={3} />
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
      <path d={LOGIN_EYE_SLASH_PATH_D} />
      <line x1={1} y1={1} x2={23} y2={23} />
    </svg>
  );
}
