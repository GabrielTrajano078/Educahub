import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms, type Classroom } from "@/api/classes";
import { createExam, fetchExam, updateExam, type ExamDetail, type ExamTypeApi } from "@/api/exams";
import { listQuestions, listQuestionDescriptors, type QuestionListItem } from "@/api/questions";
import { listSchools } from "@/api/schools";
import type { School } from "@/schemas/school";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
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

type ExamNewModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  examId?: string;
  onUpdated?: () => void;
}>;

type ExamFormModalProps = ExamNewModalProps &
  Readonly<{
    initialExam?: ExamDetail;
  }>;

type PickableExamQuestion = ExamDetail["questions"][number] & {
  descriptor: string;
  prompt: string;
};

function isPickableExamQuestion(question: ExamDetail["questions"][number]): question is PickableExamQuestion {
  return !question.missing && Boolean(question.prompt) && Boolean(question.descriptor);
}

function pickedQuestionsFromExam(exam: ExamDetail | undefined): QuestionListItem[] {
  if (!exam) return [];
  return exam.questions.filter(isPickableExamQuestion).map((q) => ({
    _id: q.questionId,
    discipline: exam.discipline,
    grade: exam.grade,
    framework: exam.framework,
    descriptor: q.descriptor,
    axis: q.axis,
    prompt: q.prompt,
    optionA: q.optionA ?? "",
    optionB: q.optionB ?? "",
    optionC: q.optionC ?? "",
    optionD: q.optionD ?? "",
  }));
}

type ExamMetadataFieldsProps = Readonly<{
  title: string;
  onTitleChange: (value: string) => void;
  showSchoolPicker: boolean;
  schoolValue: string;
  schools: School[];
  schoolsLoading: boolean;
  onSchoolPickChange: (value: string) => void;
  classroomId: string;
  classrooms: Classroom[];
  classesLoading: boolean;
  effectiveSchoolId: string;
  onClassroomIdChange: (value: string) => void;
  discipline: "LP" | "MAT";
  onDisciplineChange: (value: string) => void;
  grade: "5" | "9";
  onGradeChange: (value: string) => void;
  examFlow: ExamFlow;
  onExamFlowChange: (value: string) => void;
}>;

function ExamMetadataFields({
  title,
  onTitleChange,
  showSchoolPicker,
  schoolValue,
  schools,
  schoolsLoading,
  onSchoolPickChange,
  classroomId,
  classrooms,
  classesLoading,
  effectiveSchoolId,
  onClassroomIdChange,
  discipline,
  onDisciplineChange,
  grade,
  onGradeChange,
  examFlow,
  onExamFlowChange,
}: ExamMetadataFieldsProps) {
  return (
    <ModalFormPanel>
      <div className="form-grid questions-filters-grid">
        <label className="field field--span-2">
          <span>Título</span>
          <input value={title} onChange={(e) => onTitleChange(e.target.value)} required minLength={3} />
        </label>

        {showSchoolPicker ? (
          <SelectField
            label="Escola"
            value={schoolValue}
            onValueChange={onSchoolPickChange}
            options={schools.map((s) => ({ value: s._id, label: s.name }))}
            emptyOption={{ label: "Selecione…" }}
            className="field--span-2"
            required
            disabled={schoolsLoading}
          />
        ) : (
          <p className="muted small field--span-2">Escola vinculada ao seu perfil.</p>
        )}

        <SelectField
          label="Turma"
          value={classroomId}
          onValueChange={onClassroomIdChange}
          options={classrooms.map((c) => ({ value: c._id, label: `${c.name} (${c.grade}º)` }))}
          emptyOption={{ label: "Selecione…" }}
          className="field--span-2"
          required
          disabled={!effectiveSchoolId || classesLoading}
        />

        <SelectField
          label="Disciplina"
          value={discipline}
          onValueChange={onDisciplineChange}
          options={[
            { value: "LP", label: "Língua Portuguesa" },
            { value: "MAT", label: "Matemática" },
          ]}
        />
        <SelectField
          label="Ano"
          value={grade}
          onValueChange={onGradeChange}
          options={[
            { value: "5", label: "5º" },
            { value: "9", label: "9º" },
          ]}
        />
        <SelectField label="Matriz" value={FW} onValueChange={() => undefined} options={[{ value: FW, label: FW }]} disabled />
        <SelectField
          label="Tipo de prova"
          value={examFlow}
          onValueChange={onExamFlowChange}
          options={[
            { value: "DIAGNOSTICO_INICIAL", label: "Diagnóstico inicial" },
            { value: "DIAGNOSTICO_FINAL", label: "Diagnóstico final" },
            { value: "SIMULADO_1", label: "Simulado 1" },
            { value: "SIMULADO_2", label: "Simulado 2" },
            { value: "SIMULADO_3", label: "Simulado 3" },
            { value: "SIMULADO_4", label: "Simulado 4" },
            { value: "REFORCO", label: "Reforço" },
          ]}
          className="field--span-2"
        />
      </div>
    </ModalFormPanel>
  );
}

type QuestionBankPanelProps = Readonly<{
  descriptorOptions: SelectFieldOption[];
  descriptorValue: string;
  descriptorsLoading: boolean;
  descriptorsError: boolean;
  onDescriptorChange: (value: string) => void;
  searchText: string;
  onSearchTextChange: (value: string) => void;
  listLoading: boolean;
  listError: boolean;
  readyForList: boolean;
  filteredQuestions: QuestionListItem[];
  totalQuestions: number;
  onAddQuestion: (question: QuestionListItem) => void;
}>;

function QuestionBankPanel({
  descriptorOptions,
  descriptorValue,
  descriptorsLoading,
  descriptorsError,
  onDescriptorChange,
  searchText,
  onSearchTextChange,
  listLoading,
  listError,
  readyForList,
  filteredQuestions,
  totalQuestions,
  onAddQuestion,
}: QuestionBankPanelProps) {
  return (
    <ModalFormPanel
      intro={
        <p className="muted small" style={{ marginTop: 0 }}>
          Escolha o <strong>descritor</strong> no banco; as questões aparecem logo abaixo. Use o campo de enunciado para restringir pelo{" "}
          <strong>começo</strong> do texto (ex.: <strong>n</strong> mostra só enunciados que começam com “n”). Clique em{" "}
          <strong>Adicionar</strong> para montar a prova.
        </p>
      }
    >
      <div className="form-grid questions-filters-grid">
        {descriptorOptions.length > 0 ? (
          <SelectField
            label="Descritor"
            value={descriptorValue}
            onValueChange={onDescriptorChange}
            options={descriptorOptions}
            disabled={descriptorsLoading}
            className="field--span-2"
          />
        ) : null}

        {descriptorValue ? (
          <label className="field field--span-2">
            <span>Filtrar pelo começo do enunciado</span>
            <input
              value={searchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              placeholder="Ex.: digite n para ver enunciados que começam com “n”…"
              autoComplete="off"
            />
          </label>
        ) : null}
      </div>

      {descriptorsError ? (
        <p className="error small" role="alert">
          Não foi possível carregar os descritores.
        </p>
      ) : null}
      {!descriptorsLoading && !descriptorsError && descriptorOptions.length === 0 ? (
        <p className="muted small">
          Nenhum descritor cadastrado para esta disciplina e ano — cadastre questões em <Link to="/questoes">Banco de questões</Link>.
        </p>
      ) : null}
      {listLoading && descriptorValue ? <p className="muted small">Carregando questões…</p> : null}
      {listError ? (
        <p className="error small" role="alert">
          Não foi possível carregar as questões deste descritor.
        </p>
      ) : null}
      {readyForList && !listLoading && !listError && filteredQuestions.length > 0 ? (
        <div className="table-wrap table-wrap--questions">
          <table className="data-table data-table--questions">
            <thead>
              <tr>
                <th>Descritor</th>
                <th>Prévia do enunciado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => (
                <tr key={q._id}>
                  <td>
                    <code className="descriptor-pill">{q.descriptor}</code>
                  </td>
                  <td>
                    <p className="question-preview-cell">{q.prompt}</p>
                  </td>
                  <td>
                    <button type="button" className="ghost btn-compact" onClick={() => onAddQuestion(q)}>
                      Adicionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {readyForList && !listLoading && !listError && totalQuestions > 0 && filteredQuestions.length === 0 ? (
        <p className="muted small" style={{ marginBottom: 0 }}>
          Nenhuma questão com enunciado começando com “{searchText.trim()}”. Apague o filtro ou ajuste as letras.
        </p>
      ) : null}
      {readyForList && !listLoading && !listError && totalQuestions === 0 ? (
        <p className="muted small" style={{ marginBottom: 0 }}>
          Nenhuma questão cadastrada para este descritor.
        </p>
      ) : null}
    </ModalFormPanel>
  );
}

type PickedQuestionsPanelProps = Readonly<{
  picked: QuestionListItem[];
  submitLabel: string;
  submitDisabled: boolean;
  onSubmit: () => void;
  onMovePicked: (index: number, dir: -1 | 1) => void;
  onRemovePicked: (id: string) => void;
}>;

function PickedQuestionsPanel({ picked, submitLabel, submitDisabled, onSubmit, onMovePicked, onRemovePicked }: PickedQuestionsPanelProps) {
  return (
    <ModalFormPanel>
      <div className="section-header">
        <h3 className="small" style={{ margin: 0, fontSize: "0.95rem" }}>
          Questões na prova ({picked.length})
        </h3>
        <Button type="button" variant="primary" disabled={submitDisabled} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>

      {picked.length > 0 ? (
        <ol className="list" style={{ paddingLeft: "1.25rem", marginBottom: 0 }}>
          {picked.map((q, i) => (
            <li key={q._id} style={{ marginBottom: "0.65rem" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                <span className="muted small">{i + 1}.</span>
                <span className="small">{truncate(q.prompt, 100)}</span>
                <span className="muted small">({q.descriptor})</span>
                <button type="button" className="ghost btn-compact" onClick={() => onMovePicked(i, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button type="button" className="ghost btn-compact" onClick={() => onMovePicked(i, 1)} disabled={i === picked.length - 1}>
                  ↓
                </button>
                <button type="button" className="ghost btn-compact" onClick={() => onRemovePicked(q._id)}>
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted small" style={{ marginBottom: 0 }}>
          Adicione questões do banco acima para montar a prova.
        </p>
      )}
    </ModalFormPanel>
  );
}

export function ExamNewPage() {
  const navigate = useNavigate();

  return <ExamNewModal open onClose={() => navigate("/provas")} onCreated={(id) => navigate(`/provas/${id}`)} />;
}

export function ExamNewModal({ open, onClose, onCreated, examId, onUpdated }: ExamNewModalProps) {
  const examDetailQuery = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId ?? ""),
    enabled: open && Boolean(examId),
  });

  if (!open) {
    return null;
  }

  if (examId && !examDetailQuery.data) {
    return null;
  }

  return <ExamFormModal open={open} onClose={onClose} onCreated={onCreated} examId={examId} onUpdated={onUpdated} initialExam={examDetailQuery.data} />;
}

function ExamFormModal({ open, onClose, onCreated, examId, onUpdated, initialExam }: ExamFormModalProps) {
  const { state } = useAuth();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const [title, setTitle] = useState(initialExam?.title ?? "Prova diagnóstica");
  const [schoolPick, setSchoolPick] = useState(initialExam?.schoolId ?? "");
  const [classroomId, setClassroomId] = useState(initialExam?.classroomId ?? "");
  const [discipline, setDiscipline] = useState<"LP" | "MAT">(initialExam?.discipline ?? "LP");
  const [grade, setGrade] = useState<"5" | "9">(initialExam?.grade ?? "5");
  const [examFlow, setExamFlow] = useState<ExamFlow>((initialExam?.examType as ExamFlow | undefined) ?? "DIAGNOSTICO_INICIAL");

  const [descriptorFilter, setDescriptorFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [picked, setPicked] = useState<QuestionListItem[]>(() => pickedQuestionsFromExam(initialExam));
  const isEditing = Boolean(examId);

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

  const descriptors = useMemo(() => descriptorsQuery.data?.descriptors ?? [], [descriptorsQuery.data?.descriptors]);
  const descriptorOptions: SelectFieldOption[] = useMemo(() => descriptors.map((d) => ({ value: d, label: d })), [descriptors]);
  const effectiveDescriptorFilter = descriptorFilter && descriptors.includes(descriptorFilter) ? descriptorFilter : descriptors[0] ?? "";

  const questionsBankQuery = useQuery({
    queryKey: ["exam-new-questions", discipline, grade, FW, effectiveDescriptorFilter],
    queryFn: () =>
      listQuestions({
        discipline,
        grade,
        framework: FW,
        descriptor: effectiveDescriptorFilter,
      }),
    enabled: Boolean(effectiveDescriptorFilter),
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
    setPicked((prev) => {
      if (prev.some((p) => p._id === q._id)) return prev;
      if (prev.length >= MAX_QUESTIONS) {
        setFeedback({ variant: "error", message: `Limite de ${MAX_QUESTIONS} questões por prova.` });
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
      const t = next[index];
      next[index] = next[j];
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
      const body = {
        schoolId: effectiveSchoolId,
        classroomId,
        title,
        discipline,
        grade,
        framework: FW,
        examType: examTypeForApi(),
        questionIds: picked.map((p) => p._id),
      };
      return examId ? updateExam(examId, body) : createExam(body);
    },
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ["exams"] });
      if (examId) {
        void qc.invalidateQueries({ queryKey: ["exam", examId] });
      }
      setCreatedId(data.id);
      setFeedback({ variant: "success", message: examId ? "Prova atualizada com sucesso." : "Prova cadastrada com sucesso." });
    },
    onError: (e: unknown) => {
      setFeedback({ variant: "error", message: formatApiError(e, copy.examCreateError) });
    },
  });

  if (!open || state.status !== "authenticated") {
    return null;
  }

  function handleCloseFeedback() {
    const wasSuccess = feedback?.variant === "success";
    setFeedback(null);
    if (wasSuccess && createdId) {
      if (isEditing) {
        onUpdated?.();
        onClose();
        return;
      }
      if (onCreated) {
        onCreated(createdId);
        return;
      }
      onClose();
    }
  }

  const authUser = state.user;
  const listLoading = questionsBankQuery.isLoading;
  const listError = questionsBankQuery.isError;
  const readyForList = Boolean(effectiveDescriptorFilter);
  let submitLabel = isEditing ? "Salvar prova" : "Criar prova";
  if (m.isPending) {
    submitLabel = isEditing ? "Salvando…" : "Criando…";
  }

  function handleDisciplineChange(value: string) {
    setDiscipline(value as typeof discipline);
    setDescriptorFilter("");
    setSearchText("");
    setPicked([]);
  }

  function handleGradeChange(value: string) {
    setGrade(value as typeof grade);
    setDescriptorFilter("");
    setSearchText("");
    setPicked([]);
  }

  function handleDescriptorChange(value: string) {
    setDescriptorFilter(value);
    setSearchText("");
  }

  return (
    <ModalFormShell
      open={open}
      title={isEditing ? "Editar prova" : "Nova prova"}
      onClose={onClose}
      beforeDialog={<FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />}
    >
      <ExamMetadataFields
        title={title}
        onTitleChange={setTitle}
        showSchoolPicker={authUser.role === "admin" || authUser.role === "gestor"}
        schoolValue={schoolPick || (schoolsQuery.data?.length === 1 ? schoolsQuery.data[0]._id : "")}
        schools={schoolsQuery.data ?? []}
        schoolsLoading={schoolsQuery.isLoading}
        onSchoolPickChange={setSchoolPick}
        classroomId={classroomId}
        classrooms={classesQuery.data ?? []}
        classesLoading={classesQuery.isLoading}
        effectiveSchoolId={effectiveSchoolId}
        onClassroomIdChange={setClassroomId}
        discipline={discipline}
        onDisciplineChange={handleDisciplineChange}
        grade={grade}
        onGradeChange={handleGradeChange}
        examFlow={examFlow}
        onExamFlowChange={(v) => setExamFlow(v as ExamFlow)}
      />

      <QuestionBankPanel
        descriptorOptions={descriptorOptions}
        descriptorValue={effectiveDescriptorFilter}
        descriptorsLoading={descriptorsQuery.isLoading}
        descriptorsError={descriptorsQuery.isError}
        onDescriptorChange={handleDescriptorChange}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        listLoading={listLoading}
        listError={listError}
        readyForList={readyForList}
        filteredQuestions={filteredQuestions}
        totalQuestions={questionsBankQuery.data?.length ?? 0}
        onAddQuestion={addQuestion}
      />

      <PickedQuestionsPanel
        picked={picked}
        submitLabel={submitLabel}
        submitDisabled={m.isPending}
        onSubmit={() => m.mutate()}
        onMovePicked={movePicked}
        onRemovePicked={removePicked}
      />
    </ModalFormShell>
  );
}
