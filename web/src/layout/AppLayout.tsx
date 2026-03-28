import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { User } from "@/schemas/auth";

function navForRole(role: User["role"]) {
  const base = [
    { to: "/", label: "Início" },
    { to: "/provas", label: "Provas" },
    { to: "/questoes", label: "Banco de questões" },
    { to: "/turmas", label: "Turmas" },
    { to: "/alunos", label: "Alunos" },
  ];
  const extra: { to: string; label: string }[] = [];
  if (role === "admin") {
    extra.push({ to: "/questoes/nova", label: "Nova questão" });
    extra.push({ to: "/escolas", label: "Escolas" });
  }
  if (role === "gestor") {
    extra.push({ to: "/escolas", label: "Escolas" });
    extra.push({ to: "/municipio", label: "Painel município" });
  }
  if (role === "coordenador" || role === "professor" || role === "admin" || role === "gestor") {
    extra.push({ to: "/escola/resumo", label: "Resumo da escola" });
  }
  return [...base, ...extra];
}

export function AppLayout() {
  const { state, logout } = useAuth();
  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;
  const links = navForRole(user.role);

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
            API docs
          </a>
          <button type="button" className="ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <nav className="nav-main" aria-label="Principal">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <main className="content content-wide">
        <Outlet />
      </main>
    </div>
  );
}
