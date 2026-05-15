import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { deleteSchool, listSchools } from "@/api/schools";
import { TableActionIcon } from "@/components/table/TableActionIcons";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { ApiError } from "@/lib/api-client";
import { useState } from "react";
import { SchoolsListFilters } from "./schools/SchoolsListFilters";

export function SchoolsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { state } = useAuth();
  const [nameContains, setNameContains] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);

  const user = state.status === "authenticated" ? state.user : null;
  const isGestor = user?.role === "gestor";

  const q = useQuery({
    queryKey: ["schools", nameContains],
    queryFn: () => listSchools(nameContains.trim() ? { nameContains: nameContains.trim() } : undefined),
    enabled: state.status === "authenticated",
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteSchool(id),
    onSuccess: () => {
      setDeleteErr(null);
      setFeedback({ variant: "success", message: "Escola excluída com sucesso." });
      void qc.invalidateQueries({ queryKey: ["schools"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: unknown) => {
      setDeleteErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Não foi possível excluir.");
    },
  });

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
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
        {deleteErr ? (
          <p className="error" role="alert">
            {deleteErr}
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
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((s) => (
                  <tr key={s._id}>
                    <td>{s.name}</td>
                    <td className="muted small">{s.city ?? "—"}</td>
                    <td className="muted small">{s.municipalityCode ?? "—"}</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => navigate(`/escola/resumo?schoolId=${s._id}`)}
                        aria-label={`Ver ${s.name}`}
                        title="Ver detalhes"
                      >
                        <TableActionIcon name="open" />
                      </button>
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => navigate(`/escolas/nova?edit=${s._id}`)}
                        aria-label={`Editar ${s.name}`}
                        title="Editar"
                      >
                        <TableActionIcon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="btn-danger-text btn-compact"
                        disabled={deleteM.isPending}
                        aria-label={`Excluir ${s.name}`}
                        title="Excluir"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Excluir escola",
                            description: `Excluir escola "${s.name}"? Esta ação não pode ser desfeita.`,
                            variant: "danger",
                            confirmLabel: "Excluir",
                            cancelLabel: "Cancelar",
                          });
                          if (!ok) return;
                          deleteM.mutate(s._id);
                        }}
                      >
                        {deleteM.isPending && deleteM.variables === s._id ? "…" : <TableActionIcon name="delete" />}
                      </button>
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
