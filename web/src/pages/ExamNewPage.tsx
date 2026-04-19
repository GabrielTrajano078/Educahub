import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createExam, fetchSimulatedBlueprint, type ExamTypeApi } from "@/api/exams";
import { fetchQuestionSuggestions } from "@/api/questions";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";

/** Fluxo de montagem: diagnósticos por descritor, simulados por eixo, ou reforço (mesmo tipo de API que diagnóstico inicial). */
type ExamFlow =
  | "DIAGNOSTICO_INICIAL"
  | "DIAGNOSTICO_FINAL"
  | "SIMULADO_1"
  | "SIMULADO_2"
  | "SIMULADO_3"
  | "SIMULADO_4"
  | "REFORCO";

type BlueprintRow = { descriptor: string; count: number };

const FW = "SAEB" as const;

export function ExamNewPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);

  const [title, setTitle] = useState("Prova diagnóstica");
  const [schoolPick, setSchoolPick] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [discipline, setDiscipline] = useState<"LP" | "MAT">("LP");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [examFlow, setExamFlow] = useState<ExamFlow>("DIAGNOSTICO_INICIAL");
  const [rows, setRows] = useState<BlueprintRow[]>([{ descriptor: "D1", count: 5 }]);

  const user = state.status === "authenticated" ? state.user : null;

  const schoolsQuery = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: !!user && (user.role === "admin" || user.role === "gestor"),
  });

  const effectiveSchoolId = useMemo(() => {
    if (user?.role === "professor" || user?.role === "coordenador") {
      return user.schoolId ?? "";
    }
    const list = schoolsQuery.data;
    if (schoolPick) {
      return schoolPick;
    }
    if (list?.length === 1) {
      return list[0]._id;
    }
    return "";
  }, [user, schoolPick, schoolsQuery.data]);

  const classesQuery = useQuery({
    queryKey: ["classes", effectiveSchoolId],
    queryFn: () => listClassrooms({ schoolId: effectiveSchoolId }),
    enabled: Boolean(effectiveSchoolId),
  });

  const isSimulado = examFlow.startsWith("SIMULADO_");

  const simQuery = useQuery({
    queryKey: ["sim-blueprint", discipline, grade],
    queryFn: () => fetchSimulatedBlueprint({ discipline, grade }),
    enabled: isSimulado,
  });

  const axisBlocks = useMemo(() => {
    if (!isSimulado) {
      return [];
    }
    return simQuery.data?.blueprintByAxis ?? [];
  }, [isSimulado, simQuery.data]);

  const suggestionsQuery = useQuery({
    queryKey: ["suggestions", classroomId, discipline, grade],
    queryFn: () =>
      fetchQuestionSuggestions({
        classroomId,
        discipline,
        grade,
        framework: FW,
      }),
    enabled: false,
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!effectiveSchoolId || !classroomId) {
        throw new Error("Selecione escola e turma.");
      }

      const examTypeForApi = (): ExamTypeApi => {
        if (examFlow === "REFORCO") return "DIAGNOSTICO_INICIAL";
        if (examFlow === "DIAGNOSTICO_INICIAL") return "DIAGNOSTICO_INICIAL";
        if (examFlow === "DIAGNOSTICO_FINAL") return "DIAGNOSTICO_FINAL";
        return examFlow;
      };

      if (examFlow === "DIAGNOSTICO_INICIAL" || examFlow === "DIAGNOSTICO_FINAL") {
        if (!rows.length || rows.some((r) => !r.descriptor.trim() || r.count < 1)) {
          throw new Error("Preencha descritores e quantidades válidas.");
        }
        return createExam({
          schoolId: effectiveSchoolId,
          classroomId,
          title,
          discipline,
          grade,
          framework: FW,
          examType: examTypeForApi(),
          blueprint: rows.map((r) => ({ descriptor: r.descriptor.trim(), count: r.count })),
        });
      }

      if (isSimulado) {
        if (!axisBlocks.length) {
          throw new Error("Carregue a distribuição do simulado.");
        }
        return createExam({
          schoolId: effectiveSchoolId,
          classroomId,
          title,
          discipline,
          grade,
          framework: FW,
          examType: examTypeForApi(),
          blueprintByAxis: axisBlocks,
        });
      }

      const weak = suggestionsQuery.data?.weakDescriptors ?? [];
      if (!weak.length) {
        throw new Error("Carregue sugestões de reforço (descritores fracos).");
      }
      const blueprint = weak.slice(0, 8).map((w) => ({ descriptor: w.descriptor, count: 2 }));
      return createExam({
        schoolId: effectiveSchoolId,
        classroomId,
        title,
        discipline,
        grade,
        framework: FW,
        examType: "DIAGNOSTICO_INICIAL",
        blueprint,
      });
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["exams"] });
      navigate(`/provas/${data.id}`);
    },
    onError: (e: unknown) => {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro ao criar prova.");
    },
  });

  if (state.status !== "authenticated") {
    return null;
  }

  const authUser = state.user;

  return (
    <div>
      <section className="panel">
        <h2>Nova prova</h2>
        <p className="muted small">
          <Link to="/provas">← Voltar</Link>
        </p>
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}

        <div className="form-grid" style={{ maxWidth: 720, marginTop: "1rem" }}>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            Título
            <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={3} />
          </label>

          {authUser.role === "admin" || authUser.role === "gestor" ? (
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              Escola
              <select
                value={schoolPick || (schoolsQuery.data?.length === 1 ? schoolsQuery.data[0]._id : "")}
                onChange={(e) => setSchoolPick(e.target.value)}
                required
              >
                <option value="">Selecione…</option>
                {schoolsQuery.data?.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p className="muted small" style={{ gridColumn: "1 / -1" }}>
              Escola vinculada ao seu perfil.
            </p>
          )}

          <label className="field" style={{ gridColumn: "1 / -1" }}>
            Turma
            <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} required disabled={!effectiveSchoolId}>
              <option value="">Selecione…</option>
              {classesQuery.data?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.grade}º)
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            Disciplina
            <select value={discipline} onChange={(e) => setDiscipline(e.target.value as typeof discipline)}>
              <option value="LP">Língua Portuguesa</option>
              <option value="MAT">Matemática</option>
            </select>
          </label>
          <label className="field">
            Ano
            <select value={grade} onChange={(e) => setGrade(e.target.value as typeof grade)}>
              <option value="5">5º</option>
              <option value="9">9º</option>
            </select>
          </label>
          <p className="muted small" style={{ gridColumn: "1 / -1", margin: 0 }}>
            Matriz avaliativa: <strong>SAEB</strong>
          </p>

          <label className="field" style={{ gridColumn: "1 / -1" }}>
            Tipo de prova
            <select value={examFlow} onChange={(e) => setExamFlow(e.target.value as ExamFlow)}>
              <option value="DIAGNOSTICO_INICIAL">Diagnóstico inicial (blocos por descritor)</option>
              <option value="SIMULADO_1">Simulado 1 (distribuição por eixo)</option>
              <option value="SIMULADO_2">Simulado 2 (distribuição por eixo)</option>
              <option value="SIMULADO_3">Simulado 3 (distribuição por eixo)</option>
              <option value="SIMULADO_4">Simulado 4 (distribuição por eixo)</option>
              <option value="DIAGNOSTICO_FINAL">Diagnóstico final (blocos por descritor)</option>
              <option value="REFORCO">Reforço (descritores fracos da turma)</option>
            </select>
          </label>

          {examFlow === "DIAGNOSTICO_INICIAL" || examFlow === "DIAGNOSTICO_FINAL" ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="muted small">Blocos: cada descritor com quantidade de questões sorteadas do banco.</p>
              {rows.map((row, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
                  <input
                    placeholder="Descritor"
                    value={row.descriptor}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], descriptor: e.target.value };
                      setRows(next);
                    }}
                  />
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={row.count}
                    onChange={(e) => {
                      const next = [...rows];
                      next[i] = { ...next[i], count: Number(e.target.value) || 1 };
                      setRows(next);
                    }}
                    style={{ width: 80 }}
                  />
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    disabled={rows.length <= 1}
                  >
                    Remover
                  </button>
                </div>
              ))}
              <button type="button" className="ghost" onClick={() => setRows([...rows, { descriptor: "", count: 3 }])}>
                + Bloco
              </button>
            </div>
          ) : null}

          {isSimulado ? (
            <div style={{ gridColumn: "1 / -1" }}>
              {simQuery.isLoading ? <p className="muted">Carregando blueprint…</p> : null}
              {simQuery.isError ? (
                <p className="error">{simQuery.error instanceof ApiError ? simQuery.error.message : "Erro"}</p>
              ) : null}
              {axisBlocks.length > 0 ? (
                <ul className="list">
                  {axisBlocks.map((b) => (
                    <li key={b.axis}>
                      {b.axis}: {b.count} questão(ões) — total {simQuery.data?.totalQuestions ?? "—"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted">A distribuição é carregada automaticamente ao escolher disciplina e ano.</p>
              )}
            </div>
          ) : null}

          {examFlow === "REFORCO" ? (
            <div style={{ gridColumn: "1 / -1" }}>
              <button
                type="button"
                className="ghost"
                disabled={!classroomId || suggestionsQuery.isFetching}
                onClick={() => {
                  setErr(null);
                  void suggestionsQuery.refetch();
                }}
              >
                {suggestionsQuery.isFetching ? "Carregando…" : "Carregar descritores fracos"}
              </button>
              {suggestionsQuery.data ? (
                <div className="table-wrap">
                  <p className="small muted">
                    Serão usados até 8 descritores mais fracos, 2 questões cada (ajuste futuro na API se precisar). A prova é registrada como diagnóstico inicial.
                  </p>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Descritor</th>
                        <th>Eixo</th>
                        <th>% acerto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestionsQuery.data.weakDescriptors.map((w) => (
                        <tr key={w.descriptor}>
                          <td>{w.descriptor}</td>
                          <td>{w.axis ?? "—"}</td>
                          <td>{w.accuracy}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {suggestionsQuery.data.weakDescriptors.length === 0 ? (
                    <p className="muted">Sem histórico suficiente — aplique provas e correções antes.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="row-actions">
          <button type="button" className="primary" disabled={m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Criando…" : "Criar prova"}
          </button>
        </div>
      </section>
    </div>
  );
}
