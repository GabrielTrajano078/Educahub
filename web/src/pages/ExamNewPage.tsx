import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createExam, type ExamTypeApi } from "@/api/exams";
import { listQuestions, listQuestionDescriptors, type QuestionListItem } from "@/api/questions";
import { listSchools } from "@/api/schools";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { ApiError } from "@/lib/api-client";
import { copy } from "@/lib/copy";
import { formatApiError } from "@/lib/format-api-error";

type ExamFlow =
  | "DIAGNOSTICO_INICIAL"
  | "DIAGNOSTICO_FINAL"
  | "SIMULADO_1"
  | "SIMULADO_2"
  | "SIMULADO_3"
  | "SIMULADO_4"
  | "REFORCO";

const FW = "SAEB" as const;
const MAX_QUESTIONS = 40;

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n)}…`;
}

export function ExamNewPage() {
  const { state } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  const [title, setTitle] = useState("Prova diagnóstica");
  const [schoolPick, setSchoolPick] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [discipline, setDiscipline] = useState<"LP" | "MAT">("LP");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [examFlow, setExamFlow] = useState<ExamFlow>("DIAGNOSTICO_INICIAL");

  const [descriptorFilter, setDescriptorFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [picked, setPicked] = useState<QuestionListItem[]>([]);

  useEffect(() => {
    setPicked([]);
  }, [discipline, grade]);

  const user = state.status === "authenticated" ? state.user : null;

  const schoolsQuery = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
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

  const descriptorsQuery = useQuery({
    queryKey: ["question-descriptors", discipline, grade, FW],
    queryFn: () => listQuestionDescriptors({ discipline, grade, framework: FW }),
  });

  const descriptorOptions: SelectFieldOption[] = useMemo(
    () => (descriptorsQuery.data?.descriptors ?? []).map((d) => ({ value: d, label: d })),
    [descriptorsQuery.data?.descriptors],
  );

  useEffect(() => {
    const list = descriptorsQuery.data?.descriptors ?? [];
    if (list.length === 0) {
      setDescriptorFilter("");
      return;
    }
    setDescriptorFilter((prev) => (prev && list.includes(prev) ? prev : list[0]!));
  }, [descriptorsQuery.data?.descriptors, discipline, grade]);

  useEffect(() => {
    setSearchText("");
  }, [descriptorFilter]);

  const questionsBankQuery = useQuery({
    queryKey: ["exam-new-questions", discipline, grade, FW, descriptorFilter],
    queryFn: () =>
      listQuestions({
        discipline,
        grade,
        framework: FW,
        descriptor: descriptorFilter,
      }),
    enabled: Boolean(descriptorFilter),
  });

  const filteredQuestions = useMemo(() => {
    const list = questionsBankQuery.data ?? [];
    const prefix = searchText.trim().toLowerCase();
    if (!prefix) return list;
    return list.filter((q) => q.prompt.trim().toLowerCase().startsWith(prefix));
  }, [questionsBankQuery.data, searchText]);

  const examTypeForApi = (): ExamTypeApi => {
    if (examFlow === "REFORCO") return "DIAGNOSTICO_INICIAL";
    if (examFlow === "DIAGNOSTICO_INICIAL") return "DIAGNOSTICO_INICIAL";
    if (examFlow === "DIAGNOSTICO_FINAL") return "DIAGNOSTICO_FINAL";
    return examFlow;
  };

  function addQuestion(q: QuestionListItem) {
    setErr(null);
    setPicked((prev) => {
      if (prev.some((p) => p._id === q._id)) return prev;
      if (prev.length >= MAX_QUESTIONS) {
        setErr(`Limite de ${MAX_QUESTIONS} questões por prova.`);
        return prev;
      }
      return [...prev, q];
    });
  }

  function removePicked(id: string) {
    setPicked((prev) => prev.filter((p) => p._id !== id));
  }

  function movePicked(index: number, dir: -1 | 1) {
    setPicked((prev) => {
      const j = index + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      const t = next[index]!;
      next[index] = next[j]!;
      next[j] = t;
      return next;
    });
  }

  const m = useMutation({
    mutationFn: async () => {
      if (!effectiveSchoolId || !classroomId) {
        throw new Error("Selecione escola e turma.");
      }
      if (!picked.length) {
        throw new Error("Adicione pelo menos uma questão à prova.");
      }
      return createExam({
        schoolId: effectiveSchoolId,
        classroomId,
        title,
        discipline,
        grade,
        framework: FW,
        examType: examTypeForApi(),
        questionIds: picked.map((p) => p._id),
      });
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["exams"] });
      setPendingNavigate(`/provas/${data.id}`);
      setFeedback({ variant: "success", message: "Prova cadastrada com sucesso." });
    },
    onError: (e: unknown) => {
      setFeedback({ variant: "error", message: formatApiError(e, copy.examCreateError) });
    },
  });

  if (state.status !== "authenticated") {
    return null;
  }

  function handleCloseFeedback() {
    setFeedback(null);
    if (pendingNavigate) {
      const to = pendingNavigate;
      setPendingNavigate(null);
      navigate(to);
    }
  }

  const authUser = state.user;
  const listLoading = questionsBankQuery.isLoading;
  const listError = questionsBankQuery.isError;
  const readyForList = Boolean(descriptorFilter);

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      <section className="panel">
        <h2>Nova prova</h2>
        <p className="muted small">
          <Link to="/provas">← Voltar</Link>
        </p>

        <div className="form-grid" style={{ maxWidth: 800, marginTop: "1rem" }}>
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
            <select
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
              required
              disabled={!effectiveSchoolId}
            >
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
              <option value="DIAGNOSTICO_INICIAL">Diagnóstico inicial</option>
              <option value="DIAGNOSTICO_FINAL">Diagnóstico final</option>
              <option value="SIMULADO_1">Simulado 1</option>
              <option value="SIMULADO_2">Simulado 2</option>
              <option value="SIMULADO_3">Simulado 3</option>
              <option value="SIMULADO_4">Simulado 4</option>
              <option value="REFORCO">Reforço</option>
            </select>
          </label>

          <div style={{ gridColumn: "1 / -1" }}>
            <p className="muted small" style={{ marginTop: 0 }}>
              Escolha o <strong>descritor</strong> no banco; as questões aparecem logo abaixo. Use o campo de enunciado para
              restringir pelo <strong>começo</strong> do texto (ex.: <strong>n</strong> mostra só enunciados que começam com “n”). Clique em{" "}
              <strong>Adicionar</strong> para montar a prova.
            </p>

            {descriptorOptions.length > 0 ? (
              <SelectField
                label="Descritor"
                value={descriptorFilter}
                onValueChange={setDescriptorFilter}
                options={descriptorOptions}
                disabled={descriptorsQuery.isLoading}
                style={{ gridColumn: "1 / -1" }}
              />
            ) : null}

            {descriptorsQuery.isError ? (
              <p className="error small" role="alert" style={{ margin: 0 }}>
                Não foi possível carregar os descritores.
              </p>
            ) : null}
            {!descriptorsQuery.isLoading && !descriptorsQuery.isError && descriptorOptions.length === 0 ? (
              <p className="muted small" style={{ margin: 0 }}>
                Nenhum descritor cadastrado para esta disciplina e ano — cadastre questões em <Link to="/questoes">Banco de questões</Link>.
              </p>
            ) : null}

            {descriptorFilter ? (
              <label className="field" style={{ gridColumn: "1 / -1", marginBottom: "0.75rem" }}>
                Filtrar pelo começo do enunciado
                <input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Ex.: digite n para ver enunciados que começam com “n”…"
                  autoComplete="off"
                />
              </label>
            ) : null}

            {listLoading && descriptorFilter ? <p className="muted small">Carregando questões…</p> : null}
            {listError ? (
              <p className="error small" role="alert">
                Não foi possível carregar as questões deste descritor.
              </p>
            ) : null}

            {readyForList && !listLoading && !listError && filteredQuestions.length > 0 ? (
              <div className="table-wrap" style={{ marginTop: "0.5rem" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Descritor</th>
                      <th>Enunciado</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((q) => (
                      <tr key={q._id}>
                        <td className="muted small">{q.descriptor}</td>
                        <td className="small">{truncate(q.prompt, 140)}</td>
                        <td>
                          <button type="button" className="ghost" onClick={() => addQuestion(q)}>
                            Adicionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {readyForList && !listLoading && !listError && (questionsBankQuery.data?.length ?? 0) > 0 && filteredQuestions.length === 0 ? (
              <p className="muted small" style={{ marginBottom: 0 }}>
                Nenhuma questão com enunciado começando com “{searchText.trim()}”. Apague o filtro ou ajuste as letras.
              </p>
            ) : null}

            {readyForList && !listLoading && !listError && (questionsBankQuery.data?.length ?? 0) === 0 ? (
              <p className="muted small" style={{ marginBottom: 0 }}>
                Nenhuma questão cadastrada para este descritor.
              </p>
            ) : null}

            {picked.length > 0 ? (
              <div style={{ marginTop: "1.25rem" }}>
                <h3 className="small" style={{ margin: "0 0 0.5rem", fontSize: "0.95rem" }}>
                  Questões na prova ({picked.length})
                </h3>
                <ol className="list" style={{ paddingLeft: "1.25rem", margin: 0 }}>
                  {picked.map((q, i) => (
                    <li key={q._id} style={{ marginBottom: "0.65rem" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                        <span className="muted small">{i + 1}.</span>
                        <span className="small">{truncate(q.prompt, 100)}</span>
                        <span className="muted small">({q.descriptor})</span>
                        <button type="button" className="ghost" onClick={() => movePicked(i, -1)} disabled={i === 0}>
                          ↑
                        </button>
                        <button type="button" className="ghost" onClick={() => movePicked(i, 1)} disabled={i === picked.length - 1}>
                          ↓
                        </button>
                        <button type="button" className="ghost" onClick={() => removePicked(q._id)}>
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
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
