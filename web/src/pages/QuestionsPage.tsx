import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { QuestionListItem } from "@/api/questions";
import { deleteQuestion, listQuestions } from "@/api/questions";
import { QuestionPreviewModal } from "@/components/QuestionPreviewModal";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { TableActionIcon } from "@/components/table/TableActionIcons";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/use-confirm";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { ApiError } from "@/lib/api-client";
import { axisLabel, CURRICULUM_AXIS_CODES, type CurriculumAxisCode } from "@/lib/curriculum-axis";
import { copy } from "@/lib/copy";
import { disciplineLabel } from "@/lib/discipline";
import { formatApiError } from "@/lib/format-api-error";
import { QuestionNewModal } from "./QuestionNewPage";

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

export function QuestionsPage() {
  const { state } = useAuth();
  const confirm = useConfirm();
  const [sp, setSp] = useSearchParams();
  const [preview, setPreview] = useState<QuestionListItem | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);

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
    queryKey: ["questions", filters],
    queryFn: () => listQuestions(filters),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteQuestion(id),
    onSuccess: () => {
      setDeleteErr(null);
      setFeedback({ variant: "success", message: "Questão excluída com sucesso." });
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

  const questionCreateOpen = sp.get("nova") === "1";
  const questionEditId = sp.get("edit")?.trim() || null;

  function openQuestionCreate() {
    const next = new URLSearchParams(sp);
    next.set("nova", "1");
    next.delete("edit");
    setSp(next, { replace: false });
  }

  function openQuestionEdit(id: string) {
    const next = new URLSearchParams(sp);
    next.set("edit", id);
    next.delete("nova");
    setSp(next, { replace: false });
  }

  function closeQuestionModal() {
    const next = new URLSearchParams(sp);
    next.delete("nova");
    next.delete("edit");
    setSp(next, { replace: true });
  }

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      <QuestionPreviewModal question={preview} onClose={() => setPreview(null)} />
      {questionCreateOpen || questionEditId ? (
        <QuestionNewModal
          open
          onClose={closeQuestionModal}
          questionId={questionEditId ?? undefined}
          onCreated={closeQuestionModal}
          onUpdated={closeQuestionModal}
        />
      ) : null}
      <section className="panel">
        <div className="section-header">
          <h2>Banco de questões</h2>
          {state.user.role === "admin" ? (
            <Button type="button" variant="primary" onClick={openQuestionCreate}>
              Nova questão
            </Button>
          ) : null}
        </div>
        <p className="muted small">Professores visualizam e selecionam itens na criação da prova; apenas admin cadastra ou altera o banco.</p>

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
            <span>Descritor (contém)</span>
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
            {formatApiError(q.error, copy.questionsListError)}
          </p>
        ) : null}
        {q.data?.length === 0 ? (
          <EmptyState
            title="Nenhuma questão encontrada"
            description="Ajuste os filtros ou cadastre novos itens no banco (até 200 resultados por busca)."
            action={
              state.user.role === "admin" ? (
                <Button type="button" variant="primary" onClick={openQuestionCreate}>
                  Cadastrar questão
                </Button>
              ) : null
            }
          />
        ) : null}
        {deleteErr ? (
          <p className="error" role="alert">
            {deleteErr}
          </p>
        ) : null}
        {q.data && q.data.length > 0 ? (
          <div className="table-wrap table-wrap--questions">
            <table className="data-table data-table--questions">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Ano</th>
                  <th>Descritor</th>
                  <th>Eixo</th>
                  <th>Prévia do enunciado</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((row) => (
                  <tr key={row._id}>
                    <td>{disciplineLabel(row.discipline)}</td>
                    <td>{row.grade}º</td>
                    <td>
                      <code className="descriptor-pill">{row.descriptor}</code>
                    </td>
                    <td className="muted small">{row.axis ? axisLabel(row.axis) : "—"}</td>
                    <td>
                      <p className="question-preview-cell">{row.prompt}</p>
                    </td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => setPreview(row)}
                        aria-label={`Ver questão ${row.descriptor}`}
                        title="Ver detalhes"
                      >
                        <TableActionIcon name="open" />
                      </button>
                      {state.user.role === "admin" ? (
                        <button
                          type="button"
                          className="ghost btn-compact"
                          onClick={() => openQuestionEdit(row._id)}
                          aria-label={`Editar questão ${row.descriptor}`}
                          title="Editar"
                        >
                          <TableActionIcon name="edit" />
                        </button>
                      ) : null}
                      {state.user.role === "admin" ? (
                        <button
                          type="button"
                          className="btn-danger-text btn-compact"
                          disabled={deleteM.isPending}
                          aria-label={`Excluir questão ${row.descriptor}`}
                          title="Excluir"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Excluir questão",
                              description: `Excluir questão "${row.descriptor}"? Esta ação não pode ser desfeita.`,
                              variant: "danger",
                              confirmLabel: "Excluir",
                              cancelLabel: "Cancelar",
                            });
                            if (!ok) return;
                            deleteM.mutate(row._id);
                          }}
                        >
                          {deleteM.isPending && deleteM.variables === row._id ? "…" : <TableActionIcon name="delete" />}
                        </button>
                      ) : null}
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
