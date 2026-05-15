import { Link } from "react-router-dom";
import type { Classroom } from "@/api/classes";
import { ApiError } from "@/lib/api-client";
import { TableActionIcon } from "@/components/table/TableActionIcons";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { User } from "@/schemas/auth";

export type RegisteredClassesTableProps = {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  classrooms: Classroom[] | undefined;
  schoolNameById: Map<string, string>;
  user: User;
  canCreate: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
  deletePendingId?: string;
};

export function RegisteredClassesTable({
  isLoading,
  isError,
  error,
  classrooms,
  schoolNameById,
  user,
  canCreate,
  onView,
  onEdit,
  onDelete,
  deletePendingId,
}: RegisteredClassesTableProps) {
  if (isLoading) {
    return <p className="muted">Carregando…</p>;
  }
  if (isError) {
    return (
      <p className="error" role="alert">
        {error instanceof ApiError ? error.message : "Erro."}
      </p>
    );
  }
  if (classrooms === undefined) {
    return null;
  }
  if (classrooms.length === 0) {
    return (
      <EmptyState
        title="Nenhuma turma cadastrada"
        description="Cadastre uma turma ou importe uma planilha para começar."
        action={
          canCreate ? (
            <Button asChild variant="primary">
              <Link to="/turmas?nova=1">Nova turma</Link>
            </Button>
          ) : null
        }
      />
    );
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Ano</th>
            <th>Escola</th>
            <th className="col-actions">Ações</th>
          </tr>
        </thead>
        <tbody>
          {classrooms.map((c) => (
            <tr key={c._id}>
              <td>{c.name}</td>
              <td>{c.grade}º</td>
              <td className="small">
                {schoolNameById.get(c.schoolId) ??
                  (user.role === "coordenador" || user.role === "professor" ? "Escola do perfil" : "—")}
              </td>
              <td className="col-actions">
                <button
                  type="button"
                  className="ghost btn-compact"
                  onClick={() => onView(c._id)}
                  aria-label={`Ver turma ${c.name}`}
                  title="Ver detalhes"
                >
                  <TableActionIcon name="open" />
                </button>
                {canCreate ? (
                  <button
                    type="button"
                    className="ghost btn-compact"
                    onClick={() => onEdit(c._id)}
                    aria-label={`Editar turma ${c.name}`}
                    title="Editar"
                  >
                    <TableActionIcon name="edit" />
                  </button>
                ) : null}
                {canCreate ? (
                  <button
                    type="button"
                    className="btn-danger-text btn-compact"
                    onClick={() => onDelete(c._id, c.name)}
                    aria-label={`Excluir turma ${c.name}`}
                    title="Excluir"
                    disabled={deletePendingId === c._id}
                  >
                    {deletePendingId === c._id ? "…" : <TableActionIcon name="delete" />}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
