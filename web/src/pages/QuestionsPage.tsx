import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import type { QuestionListItem } from "@/api/questions";
import { listQuestions } from "@/api/questions";
import { QuestionPreviewModal } from "@/components/QuestionPreviewModal";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
  const [sp, setSp] = useSearchParams();
  const [preview, setPreview] = useState<QuestionListItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

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

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <QuestionPreviewModal question={preview} onClose={() => setPreview(null)} />
      {createOpen ? <QuestionNewModal open onClose={() => setCreateOpen(false)} /> : null}
      <section className="panel">
        <div className="section-header">
          <h2>Banco de questões</h2>
          {state.user.role === "admin" ? (
            <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
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
                <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
                  Cadastrar questão
                </Button>
              ) : null
            }
          />
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
                  <th></th>
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
                    <td>
                      <button type="button" className="ghost btn-compact" onClick={() => setPreview(row)}>
                        Abrir
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
