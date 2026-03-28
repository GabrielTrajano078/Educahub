import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";

export function DashboardPage() {
  const { state, logout } = useAuth();
  const canListSchools =
    state.status === "authenticated" && (state.user.role === "admin" || state.user.role === "gestor");
  const schoolsQuery = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: canListSchools,
  });

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>SAEB / SPA-S</h1>
          <p className="muted small">
            {user.fullName} · {user.email} · {user.role}
          </p>
        </div>
        <div className="topbar-actions">
          <a className="link" href="/docs" target="_blank" rel="noreferrer">
            Documentação da API
          </a>
          <button type="button" className="ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </header>

      <main className="content">
        <section className="panel">
          <h2>Início</h2>
          <p className="muted">
            Painel conectado à API. Em desenvolvimento, o Swagger está em{" "}
            <a href="/docs" target="_blank" rel="noreferrer">
              /docs
            </a>{" "}
            (via proxy do Vite).
          </p>
        </section>

        {canListSchools ? (
          <section className="panel">
            <h2>Escolas</h2>
            {schoolsQuery.isLoading ? <p className="muted">Carregando…</p> : null}
            {schoolsQuery.isError ? (
              <p className="error" role="alert">
                {schoolsQuery.error instanceof ApiError
                  ? schoolsQuery.error.message
                  : "Não foi possível carregar as escolas."}
              </p>
            ) : null}
            {schoolsQuery.data?.length === 0 ? <p className="muted">Nenhuma escola cadastrada.</p> : null}
            {schoolsQuery.data && schoolsQuery.data.length > 0 ? (
              <ul className="list">
                {schoolsQuery.data.map((s) => (
                  <li key={s._id}>
                    <strong>{s.name}</strong>
                    {s.city ? <span className="muted"> — {s.city}</span> : null}
                    {s.municipalityCode ? (
                      <span className="muted small"> · IBGE {s.municipalityCode}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : (
          <section className="panel muted">
            <p>Seu perfil não tem permissão para listar escolas nesta tela.</p>
          </section>
        )}
      </main>
    </div>
  );
}
