import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { TableActionIcon } from "@/components/table/TableActionIcons";
import { ExamDetailModal } from "@/pages/ExamDetailModal";
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

export function ExamsPage() {
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const confirm = useConfirm();

  const discipline = parseDiscipline(sp.get("discipline"));
  const grade = parseGrade(sp.get("grade"));
  const framework = parseFramework(sp.get("framework"));
  const descriptor = sp.get("descriptor") ?? "";
  const axis = parseAxis(sp.get("axis"));

  const examCreateOpen = sp.get("nova") === "1";
  const examEditId = sp.get("edit")?.trim() || null;
  const examViewId = sp.get("ver")?.trim() || null;

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

  function openExamCreate() {
    const next = new URLSearchParams(sp);
    next.set("nova", "1");
    next.delete("edit");
    next.delete("ver");
    setSp(next, { replace: false });
  }

  function openExamEdit(id: string) {
    const next = new URLSearchParams(sp);
    next.set("edit", id);
    next.delete("nova");
    next.delete("ver");
    setSp(next, { replace: false });
  }

  function openExamView(id: string) {
    const next = new URLSearchParams(sp);
    next.set("ver", id);
    next.delete("nova");
    next.delete("edit");
    setSp(next, { replace: false });
  }

  function closeExamModal() {
    const next = new URLSearchParams(sp);
    next.delete("nova");
    next.delete("edit");
    next.delete("ver");
    setSp(next, { replace: true });
  }

  function closeExamViewModal() {
    const next = new URLSearchParams(sp);
    next.delete("ver");
    setSp(next, { replace: true });
  }

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      {examCreateOpen || examEditId ? (
        <ExamNewModal
          open
          onClose={closeExamModal}
          examId={examEditId ?? undefined}
          onCreated={() => closeExamModal()}
          onUpdated={() => closeExamModal()}
        />
      ) : null}
      <ExamDetailModal open={Boolean(examViewId)} examId={examViewId} onClose={closeExamViewModal} />
      <section className="panel">
        <div className="section-header">
          <h2>Provas</h2>
          <Button type="button" variant="primary" onClick={openExamCreate}>
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
              <Button type="button" variant="primary" onClick={openExamCreate}>
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
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => openExamView(e._id)}
                        aria-label={`Ver detalhes de ${e.title}`}
                        title="Ver detalhes"
                      >
                        <TableActionIcon name="open" />
                      </button>
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => openExamEdit(e._id)}
                        aria-label={`Editar ${e.title}`}
                        title="Editar"
                      >
                        <TableActionIcon name="edit" />
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
                        {deleteM.isPending && deleteM.variables === e._id ? "…" : <TableActionIcon name="delete" />}
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
