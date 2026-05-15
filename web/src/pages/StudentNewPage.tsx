import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createStudent } from "@/api/students";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import type { User } from "@/schemas/auth";
import { NewStudentForm, type NewStudentFormPayload } from "./students/NewStudentForm";

type StudentNewModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  /** Turma pré-selecionada (ex.: filtro atual na listagem de alunos). */
  initialClassroomId?: string;
}>;

type StudentNewModalMountedProps = Readonly<{
  open: boolean;
  onClose: () => void;
  initialClassroomId?: string;
  user: User;
}>;

function StudentNewModalMounted({ open, onClose, initialClassroomId, user }: StudentNewModalMountedProps) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [classroomId, setClassroomId] = useState(() => initialClassroomId ?? "");
  const [fullName, setFullName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  const classesQ = useQuery({
    queryKey: ["classes", "student-new-modal"],
    queryFn: () => listClassrooms(),
    enabled: open && Boolean(user),
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
      const message = e instanceof Error ? e.message : "Erro.";
      setFeedback({ variant: "error", message });
    },
  });

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (e) => {
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
  };

  function handleCloseFeedback() {
    setFeedback(null);
    if (pendingNavigate) {
      const to = pendingNavigate;
      setPendingNavigate(null);
      navigate(to);
      onClose();
    }
  }

  const classroomOptions = (classesQ.data ?? []).map((c) => ({
    value: c._id,
    label: `${c.name} (${c.grade}º)`,
  }));

  return (
    <ModalFormShell open={open} title="Novo aluno" onClose={onClose} beforeDialog={<FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />}>
      <ModalFormPanel
        intro={
          <p className="muted small" style={{ marginTop: 0 }}>
            Turma, nome completo e código de matrícula. Importação por Excel fica na listagem de alunos.
          </p>
        }
      >
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
      </ModalFormPanel>
    </ModalFormShell>
  );
}

export function StudentNewModal({ open, onClose, initialClassroomId }: StudentNewModalProps) {
  const { state } = useAuth();

  if (!open) {
    return null;
  }

  if (state.status !== "authenticated") {
    return null;
  }

  const user = state.user;

  return (
    <StudentNewModalMounted
      key={initialClassroomId ?? ""}
      open={open}
      onClose={onClose}
      initialClassroomId={initialClassroomId}
      user={user}
    />
  );
}
