import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { deleteExam, listExams } from "@/api/exams";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ApiError } from "@/lib/api-client";
import { axisLabel, CURRICULUM_AXIS_CODES, type CurriculumAxisCode } from "@/lib/curriculum-axis";
import { copy } from "@/lib/copy";
import { disciplineLabel } from "@/lib/discipline";
import { formatApiError } from "@/lib/format-api-error";
import { ExamNewModal } from "./ExamNewPage";

const DISCIPLINE_FILTER_OPTIONS: SelectFieldOption[] = [
  { value: "LP", label: "Língua Portuguesa" },
  { value: "MAT", label: "Matemática" },
];

const AXIS_FILTER_OPTIONS: SelectFieldOption[] = CURRICULUM_AXIS_CODES.map((code) => ({
  value: code,
  label: axisLabel(code),
}));

function parseDiscipline(v: string | null): "" | "LP" | "MAT" {
  if (v === "LP" || v === "MAT") return v;
  return "";
}

function parseGrade(v: string | null): "" | "5" | "9" {
  if (v === "5" || v === "9") return v;
  return "";
}

function parseFramework(v: string | null): "" | "SAEB" {
  if (v === "SAEB") return v;
  return "";
}

function parseAxis(v: string | null): "" | CurriculumAxisCode {
  if (v && (CURRICULUM_AXIS_CODES as readonly string[]).includes(v)) {
    return v as CurriculumAxisCode;
  }
  return "";
}

const actionIconProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function ActionIcon({ name }: Readonly<{ name: "open" | "edit" | "delete" }>) {
  if (name === "open") {
    return (
      <svg {...actionIconProps}>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg {...actionIconProps}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    );
  }
  return (
    <svg {...actionIconProps}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

export function ExamsPage() {
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const confirm = useConfirm();

  const discipline = parseDiscipline(sp.get("discipline"));
  const grade = parseGrade(sp.get("grade"));
  const framework = parseFramework(sp.get("framework"));
  const descriptor = sp.get("descriptor") ?? "";
  const axis = parseAxis(sp.get("axis"));

  const setDiscipline = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set("discipline", v);
    else next.delete("discipline");
    setSp(next, { replace: true });
  };
  const setGrade = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set("grade", v);
    else next.delete("grade");
    setSp(next, { replace: true });
  };
  const setFramework = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set("framework", v);
    else next.delete("framework");
    setSp(next, { replace: true });
  };
  const setAxis = (v: string) => {
    const next = new URLSearchParams(sp);
    if (v) next.set("axis", v);
    else next.delete("axis");
    setSp(next, { replace: true });
  };

  const filters = useMemo(
    () => ({
      ...(discipline ? { discipline } : {}),
      ...(grade ? { grade } : {}),
      ...(framework ? { framework } : {}),
      ...(descriptor.trim() ? { descriptor: descriptor.trim() } : {}),
      ...(axis ? { axis } : {}),
    }),
    [discipline, grade, framework, descriptor, axis],
  );

  const q = useQuery({
    queryKey: ["exams", filters],
    queryFn: () => listExams(filters),
    enabled: state.status === "authenticated",
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteExam(id),
    onSuccess: () => {
      setDeleteErr(null);
      setFeedback({ variant: "success", message: "Prova excluída com sucesso." });
      void q.refetch();
    },
    onError: (e: unknown) => {
      if (e instanceof ApiError || e instanceof Error) {
        setDeleteErr(e.message);
        return;
      }
      setDeleteErr("Não foi possível excluir.");
    },
  });

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      {createOpen ? <ExamNewModal open onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} /> : null}
      {editingExamId ? <ExamNewModal open examId={editingExamId} onClose={() => setEditingExamId(null)} /> : null}
      <section className="panel">
        <div className="section-header">
          <h2>Provas</h2>
          <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
            Nova prova
          </Button>
        </div>

        <div className="form-grid questions-filters-grid">
          <SelectField
            label="Disciplina"
            value={discipline}
            onValueChange={setDiscipline}
            options={DISCIPLINE_FILTER_OPTIONS}
            emptyOption={{ label: "Todas" }}
          />
          <SelectField
            label="Ano"
            value={grade}
            onValueChange={setGrade}
            options={[
              { value: "5", label: "5º" },
              { value: "9", label: "9º" },
            ]}
            emptyOption={{ label: "Todos" }}
          />
          <SelectField
            label="Matriz"
            value={framework}
            onValueChange={setFramework}
            options={[{ value: "SAEB", label: "SAEB" }]}
            emptyOption={{ label: "Todas" }}
          />
          <label className="field field--span-2">
            Descritor (contém){" "}
            <input
              value={descriptor}
              onChange={(e) => {
                const v = e.target.value;
                const next = new URLSearchParams(sp);
                if (v.trim()) next.set("descriptor", v);
                else next.delete("descriptor");
                setSp(next, { replace: true });
              }}
              placeholder="Ex.: D3"
            />
          </label>
          <SelectField
            label="Eixo"
            className="field--span-2"
            value={axis}
            onValueChange={setAxis}
            options={AXIS_FILTER_OPTIONS}
            emptyOption={{ label: "Todos" }}
          />
        </div>
      </section>
      <section className="panel">
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {formatApiError(q.error, copy.examListError)}
          </p>
        ) : null}
        {deleteErr ? (
          <p className="error" role="alert">
            {deleteErr}
          </p>
        ) : null}
        {q.data?.length === 0 ? (
          <EmptyState
            title="Nenhuma prova encontrada"
            description="Ajuste os filtros ou crie uma prova diagnóstica ou simulado para acompanhar resultados por turma."
            action={
              <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                Criar prova
              </Button>
            }
          />
        ) : null}
        {q.data && q.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Disciplina / Ano</th>
                  <th>Status</th>
                  <th>Qtd</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((e) => (
                  <tr key={e._id}>
                    <td>{e.title}</td>
                    <td>
                      {disciplineLabel(e.discipline)} · {e.grade}º
                    </td>
                    <td>
                      <StatusBadge status={e.status} />
                    </td>
                    <td>{e.questionCount ?? "—"}</td>
                    <td className="col-actions">
                      <Link to={`/provas/${e._id}`} className="ghost btn-compact" aria-label={`Abrir ${e.title}`} title="Abrir">
                        <ActionIcon name="open" />
                      </Link>
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => setEditingExamId(e._id)}
                        aria-label={`Editar ${e.title}`}
                        title="Editar"
                      >
                        <ActionIcon name="edit" />
                      </button>
                      <button
                        type="button"
                        className="btn-danger-text btn-compact"
                        disabled={deleteM.isPending}
                        aria-label={`Excluir ${e.title}`}
                        title="Excluir"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Excluir prova",
                            description: `Excluir "${e.title}"? Esta ação não pode ser desfeita.`,
                            variant: "danger",
                            confirmLabel: "Excluir",
                            cancelLabel: "Cancelar",
                          });
                          if (!ok) return;
                          deleteM.mutate(e._id);
                        }}
                      >
                        {deleteM.isPending && deleteM.variables === e._id ? "…" : <ActionIcon name="delete" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
