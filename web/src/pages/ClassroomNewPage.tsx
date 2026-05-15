import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useMemo, useState } from "react";
import { useAuth } from "@/auth/useAuth";
import { createClassroom, fetchClassroom, updateClassroom } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { NewClassroomForm } from "./classes/NewClassroomForm";

type ClassroomNewModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
  classroomId?: string;
}>;

export function ClassroomNewModal({ open, onClose, classroomId }: ClassroomNewModalProps) {
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
  const isEdit = Boolean(classroomId);
  const needsSchoolPicker = user && (user.role === "admin" || user.role === "gestor");

  const detailQ = useQuery({
    queryKey: ["classroom", classroomId],
    queryFn: () => fetchClassroom(classroomId!),
    enabled: open && Boolean(classroomId),
  });

  const initialFromDetail = useMemo(() => {
    if (!detailQ.data) return null;
    return {
      schoolId: detailQ.data.schoolId,
      name: detailQ.data.name,
      grade: detailQ.data.grade,
    };
  }, [detailQ.data]);

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: open && state.status === "authenticated" && Boolean(needsSchoolPicker),
  });

  const resolvedSchoolId = initialFromDetail?.schoolId ?? schoolId;
  const resolvedName = initialFromDetail?.name ?? name;
  const resolvedGrade = initialFromDetail?.grade ?? grade;
  const effectiveSchoolId = isCoord && user?.schoolId ? user.schoolId : resolvedSchoolId;

  const createM = useMutation({
    mutationFn: async () => {
      if (!classroomId) {
        return createClassroom({ schoolId: effectiveSchoolId, name: resolvedName, grade: resolvedGrade });
      }
      return updateClassroom(classroomId, { schoolId: effectiveSchoolId, name: resolvedName, grade: resolvedGrade });
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setPendingClose(true);
      setFeedback({ variant: "success", message: isEdit ? "Turma atualizada com sucesso." : "Turma cadastrada com sucesso." });
    },
    onError: (err: unknown) => {
      setFeedback({
        variant: "error",
        message: err instanceof ApiError ? err.message : isEdit ? "Não foi possível atualizar." : "Não foi possível cadastrar.",
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
    const n = resolvedName.trim();
    if (!n) {
      setFeedback({ variant: "warning", message: "Informe o nome da turma." });
      return;
    }
    setSchoolId(sid);
    createM.mutate();
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
    <ModalFormShell
      open={open}
      title={isEdit ? "Editar turma" : "Nova turma"}
      onClose={onClose}
      beforeDialog={<FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />}
    >
      <ModalFormPanel intro={<p className="muted small" style={{ marginTop: 0 }}>Escola, nome e ano. A importação por Excel fica na listagem de turmas.</p>}>
        {detailQ.isLoading ? <p className="muted">Carregando…</p> : null}
        <NewClassroomForm
          schools={schools}
          schoolId={effectiveSchoolId}
          onSchoolIdChange={setSchoolId}
          name={resolvedName}
          onNameChange={setName}
          grade={resolvedGrade}
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
