import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createStudent } from "@/api/students";
import { ApiError } from "@/lib/api-client";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { NewStudentForm, type NewStudentFormPayload } from "./students/NewStudentForm";

export function StudentNewPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { state } = useAuth();
  const [classroomId, setClassroomId] = useState(() => sp.get("classroomId") ?? "");
  const [fullName, setFullName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;

  const classesQ = useQuery({
    queryKey: ["classes", "student-new-page"],
    queryFn: () => listClassrooms(),
    enabled: Boolean(user),
  });

  const createM = useMutation({
    mutationFn: (payload: NewStudentFormPayload) => {
      const cls = classesQ.data?.find((c) => c._id === payload.classroomId);
      if (!cls) {
        throw new Error("Selecione turma.");
      }
      return createStudent({
        schoolId: cls.schoolId,
        classroomId: cls._id,
        fullName: payload.fullName,
        registrationCode: payload.registrationCode,
      });
    },
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ["students"] });
      setPendingNavigate(`/alunos?classroomId=${encodeURIComponent(variables.classroomId)}`);
      setFeedback({ variant: "success", message: "Aluno cadastrado com sucesso." });
    },
    onError: (e: unknown) => {
      let msg = "Erro.";
      if (e instanceof ApiError) msg = e.message;
      else if (e instanceof Error) msg = e.message;
      setFeedback({ variant: "error", message: msg });
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!classroomId.trim()) {
      setFeedback({ variant: "warning", message: "Selecione a turma." });
      return;
    }
    const fn = fullName.trim();
    const rc = registrationCode.trim();
    if (!fn || !rc) {
      setFeedback({ variant: "warning", message: "Preencha nome e matrícula." });
      return;
    }
    createM.mutate({ classroomId, fullName: fn, registrationCode: rc });
  }

  if (state.status !== "authenticated" || !user) {
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

  const classroomOptions = (classesQ.data ?? []).map((c) => ({
    value: c._id,
    label: `${c.name} (${c.grade}º)`,
  }));

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      <section className="panel">
        <h2>Novo aluno</h2>
        <p className="muted small">
          <Link to="/alunos">← Voltar</Link>
        </p>
        <p className="muted small">Turma, nome completo e código de matrícula. Importação por Excel fica na listagem de alunos.</p>

        <NewStudentForm
          classroomOptions={classroomOptions}
          classroomId={classroomId}
          onClassroomIdChange={setClassroomId}
          fullName={fullName}
          onFullNameChange={setFullName}
          registrationCode={registrationCode}
          onRegistrationCodeChange={setRegistrationCode}
          formError={formError}
          createM={createM}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}
