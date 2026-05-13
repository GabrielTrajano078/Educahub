import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useEffect, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { createClassroom } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { NewClassroomForm } from "./classes/NewClassroomForm";

type ClassroomNewModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function ClassroomNewModal({ open, onClose }: ClassroomNewModalProps) {
  const qc = useQueryClient();
  const { state } = useAuth();
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingClose, setPendingClose] = useState(false);

  const user = state.status === "authenticated" ? state.user : null;
  const isCoord = user?.role === "coordenador";
  const needsSchoolPicker = user && (user.role === "admin" || user.role === "gestor");

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: open && state.status === "authenticated" && Boolean(needsSchoolPicker),
  });

  const effectiveSchoolId = isCoord && user?.schoolId ? user.schoolId : schoolId;

  useEffect(() => {
    if (!open) return;
    if (isCoord && user?.schoolId) {
      setSchoolId(user.schoolId);
    }
  }, [open, isCoord, user?.schoolId]);

  const createM = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setPendingClose(true);
      setFeedback({ variant: "success", message: "Turma cadastrada com sucesso." });
    },
    onError: (err: unknown) => {
      setFeedback({
        variant: "error",
        message: err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      });
    },
  });

  const handleSubmit: NonNullable<ComponentProps<"form">["onSubmit"]> = (e) => {
    e.preventDefault();
    setFormError(null);
    const sid = effectiveSchoolId.trim();
    if (!sid) {
      setFeedback({ variant: "warning", message: "Selecione a escola." });
      return;
    }
    const n = name.trim();
    if (!n) {
      setFeedback({ variant: "warning", message: "Informe o nome da turma." });
      return;
    }
    createM.mutate({ schoolId: sid, name: n, grade });
  };

  function handleCloseFeedback() {
    setFeedback(null);
    if (pendingClose) {
      setPendingClose(false);
      onClose();
    }
  }

  if (!open) {
    return null;
  }

  if (state.status !== "authenticated" || !user) {
    return null;
  }

  const schools = schoolsQ.data ?? [];

  return (
    <ModalFormShell open={open} title="Nova turma" onClose={onClose} beforeDialog={<FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />}>
      <ModalFormPanel intro={<p className="muted small" style={{ marginTop: 0 }}>Escola, nome e ano. A importação por Excel fica na listagem de turmas.</p>}>
        <NewClassroomForm
          schools={schools}
          schoolId={effectiveSchoolId}
          onSchoolIdChange={setSchoolId}
          name={name}
          onNameChange={setName}
          grade={grade}
          onGradeChange={setGrade}
          needsSchoolPicker={Boolean(needsSchoolPicker)}
          isCoord={Boolean(isCoord)}
          user={user}
          formError={formError}
          createM={createM}
          onSubmit={handleSubmit}
        />
      </ModalFormPanel>
    </ModalFormShell>
  );
}
