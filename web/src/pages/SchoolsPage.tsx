import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listSchools } from "@/api/schools";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api-client";
import { useState } from "react";
import { SchoolsListFilters } from "./schools/SchoolsListFilters";

export function SchoolsPage() {
  const { state } = useAuth();
  const [nameContains, setNameContains] = useState("");

  const user = state.status === "authenticated" ? state.user : null;
  const isGestor = user?.role === "gestor";

  const q = useQuery({
    queryKey: ["schools", nameContains],
    queryFn: () => listSchools(nameContains.trim() ? { nameContains: nameContains.trim() } : undefined),
    enabled: state.status === "authenticated",
  });

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <section className="panel">
        <div className="section-header">
          <h2>Escolas</h2>
          <Button asChild variant="primary">
            <Link to="/escolas/nova">Nova escola</Link>
          </Button>
        </div>
        <p className="muted small">
          Filtre por descrição (nome). {isGestor ? "Novas escolas ficam no seu município." : "Administradores podem informar o código IBGE do município."}
        </p>

        <SchoolsListFilters nameContains={nameContains} onNameContainsChange={setNameContains} />
      </section>

      <section className="panel">
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {q.error instanceof ApiError ? q.error.message : "Erro."}
          </p>
        ) : null}
        {q.data && q.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Escola</th>
                  <th>Cidade</th>
                  <th>IBGE</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((s) => (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td className="muted small">{s.city ?? "—"}</td>
                    <td className="muted small">{s.municipalityCode ?? "—"}</td>
                    <td>
                      <Link to={`/escola/resumo?schoolId=${s._id}`}>Resumo</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !q.isLoading && (
            <EmptyState
              title="Nenhuma escola encontrada"
              description="Ajuste o filtro ou cadastre a primeira escola para vincular turmas e provas."
              action={
                <Button asChild variant="primary">
                  <Link to="/escolas/nova">Nova escola</Link>
                </Button>
              }
            />
          )
        )}
      </section>
    </div>
  );
}
