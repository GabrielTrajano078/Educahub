import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { BrandLogo } from "@/components/BrandLogo";
import type { User } from "@/schemas/auth";
import { NavIcon } from "./NavIcon";

function roleLabel(role: User["role"]): string {
  const map: Record<User["role"], string> = {
    admin: "Administrador",
    professor: "Professor",
    coordenador: "Coordenador",
    gestor: "Gestor municipal",
  };
  return map[role];
}

type NavItem = { to: string; label: string; roles?: User["role"][] };
type NavGroup = { label: string; roles?: User["role"][]; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  { label: "Início", items: [{ to: "/", label: "Painel" }] },
  { label: "Operação", items: [{ to: "/provas", label: "Provas" }] },
  {
    label: "Pedagógico",
    items: [
      { to: "/questoes", label: "Banco de questões" },
      { to: "/turmas", label: "Turmas" },
      { to: "/alunos", label: "Alunos" },
    ],
  },
  {
    label: "Análise",
    items: [{ to: "/escola/resumo", label: "Resumo da escola" }],
  },
  {
    label: "Cadastros",
    roles: ["admin", "gestor"],
    items: [{ to: "/escolas", label: "Escolas" }],
  },
];

function navGroupsForRole(role: User["role"]): NavGroup[] {
  return NAV_GROUPS.filter((g) => !g.roles || g.roles.includes(role))
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => !it.roles || it.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);
}

const SIDEBAR_EXPANDED_KEY = "educahub.sidebarExpanded";

function readSidebarExpanded(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_EXPANDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function AppLayout() {
  const { state, logout } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(readSidebarExpanded);
  const dockRef = useRef<HTMLDivElement>(null);
  const toggleAnchorRef = useRef<HTMLDivElement>(null);

  const updateSidebarToggleTop = useCallback(() => {
    const dock = dockRef.current;
    const anchor = toggleAnchorRef.current;
    if (!dock || !anchor) return;
    const d = dock.getBoundingClientRect();
    const a = anchor.getBoundingClientRect();
    const y = a.top - d.top;
    dock.style.setProperty("--sidebar-toggle-top", `${Math.round(y)}px`);
  }, []);

  useLayoutEffect(() => {
    const run = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(updateSidebarToggleTop);
      });
    };
    run();
    const dock = dockRef.current;
    if (!dock) return;
    const ro = new ResizeObserver(run);
    ro.observe(dock);
    const aside = dock.querySelector("aside.sidebar");
    if (aside) ro.observe(aside);
    window.addEventListener("resize", run);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [updateSidebarToggleTop, sidebarExpanded, state.status]);

  useEffect(() => {
    const t = window.setTimeout(updateSidebarToggleTop, 300);
    return () => window.clearTimeout(t);
  }, [sidebarExpanded, updateSidebarToggleTop]);

  const toggleSidebar = useCallback(() => {
    setSidebarExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_EXPANDED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;
  const groups = navGroupsForRole(user.role);

  return (
    <div className="app-shell">
      <div className="app-canvas" aria-hidden="true" />
      <div
        ref={dockRef}
        className={`sidebar-dock${sidebarExpanded ? " sidebar-dock--expanded" : ""}`}
      >
        <aside id="app-sidebar-nav" className="sidebar" aria-label="Navegação">
          <div className="sidebar-brand">
            <div className="sidebar-brand-logo-wrap">
              <BrandLogo variant="sidebar" />
            </div>
            <div className="sidebar-brand-text">
              <span className="sidebar-title">Diagnóstico SAEB</span>
              <span className="sidebar-tagline">Matriz nacional · LP e MAT (5º e 9º)</span>
            </div>
          </div>
          <div className="sidebar-body">
            {groups.map((group, gi) => (
              <Fragment key={group.label}>
                <div className="sidebar-nav-group">
                  <div className="sidebar-section-label">{group.label}</div>
                  <nav className="sidebar-nav" aria-label={group.label}>
                    {group.items.map((l) => (
                      <NavLink
                        key={l.to}
                        to={l.to}
                        end={l.to === "/"}
                        title={l.label}
                        className={({ isActive }) =>
                          isActive ? "nav-link nav-link-side active" : "nav-link nav-link-side"
                        }
                      >
                        <NavIcon to={l.to} />
                        <span className="nav-link-label">{l.label}</span>
                      </NavLink>
                    ))}
                  </nav>
                </div>
                {gi === 0 ? (
                  <div
                    ref={toggleAnchorRef}
                    className="sidebar-toggle-anchor"
                    aria-hidden
                  />
                ) : null}
              </Fragment>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="sidebar-user-card" aria-label="Sessão atual">
              <div className="sidebar-user-avatar" aria-hidden="true">
                {user.fullName.slice(0, 1).toUpperCase()}
              </div>
              <div className="sidebar-user-meta">
                <span className="sidebar-user-name">{user.fullName}</span>
                <span className="sidebar-user-email" title={user.email}>
                  {user.email}
                </span>
                <span className="badge badge-role">{roleLabel(user.role)}</span>
              </div>
            </div>
            <button type="button" className="ghost sidebar-logout" title="Sair" onClick={logout}>
              Sair
            </button>
          </div>
        </aside>
        <button
          type="button"
          className="sidebar-toggle"
          aria-expanded={sidebarExpanded}
          aria-controls="app-sidebar-nav"
          aria-label={sidebarExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
          title={sidebarExpanded ? "Recolher menu lateral" : "Expandir menu lateral"}
          onClick={toggleSidebar}
        >
          <svg
            className="sidebar-toggle__icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {sidebarExpanded ? (
              <polyline points="14 6 8 12 14 18" />
            ) : (
              <polyline points="10 6 16 12 10 18" />
            )}
          </svg>
        </button>
      </div>
      <div className="app-main">
        <main className="content content-wide">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
