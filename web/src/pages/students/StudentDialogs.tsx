import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type Student, type UpdateStudentBody, updateStudent } from "@/api/students";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { ApiError } from "@/lib/api-client";
import { NewStudentForm, type NewStudentFormPayload } from "./NewStudentForm";

type StudentViewModalProps = Readonly<{
  open: boolean;
  student: Student | null;
  turmaLabel: string;
  onClose: () => void;
}>;

export function StudentViewModal({ open, student, turmaLabel, onClose }: StudentViewModalProps) {
  if (!open || !student) {
    return null;
  }

  return (
    <ModalFormShell open title="Detalhes do aluno" onClose={onClose}>
      <ModalFormPanel>
        <div className="form-grid question-new-form" style={{ marginTop: 0 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Nome completo</span>
            <p style={{ margin: "0.35rem 0 0" }}>{student.fullName}</p>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Matrícula</span>
            <p style={{ margin: "0.35rem 0 0" }}>{student.registrationCode}</p>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Turma</span>
            <p style={{ margin: "0.35rem 0 0" }}>{turmaLabel || "—"}</p>
          </div>
        </div>
      </ModalFormPanel>
    </ModalFormShell>
  );
}

type StudentEditModalProps = Readonly<{
  open: boolean;
  student: Student | null;
  classroomOptions: readonly { value: string; label: string }[];
  onClose: () => void;
}>;

export function StudentEditModal({ open, student, classroomOptions, onClose }: StudentEditModalProps) {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [classroomId, setClassroomId] = useState("");
  const [fullName, setFullName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !student) return;
    setClassroomId(student.classroomId);
    setFullName(student.fullName);
    setRegistrationCode(student.registrationCode);
    setFormError(null);
  }, [open, student]);

  const editM = useMutation({
    mutationFn: async (payload: NewStudentFormPayload) => {
      if (!student) throw new Error("Aluno inválido.");
      const body: UpdateStudentBody = {
        fullName: payload.fullName,
        registrationCode: payload.registrationCode,
      };
      if (payload.classroomId !== student.classroomId) {
        body.classroomId = payload.classroomId;
      }
      await updateStudent(student._id, body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["students"] });
      setFeedback({ variant: "success", message: "Dados do aluno atualizados." });
    },
    onError: (e: unknown) => {
      setFeedback({ variant: "error", message: e instanceof ApiError ? e.message : "Não foi possível salvar." });
    },
  });

  function handleCloseFeedback() {
    const ok = feedback?.variant === "success";
    setFeedback(null);
    if (ok) {
      onClose();
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!student) return;
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
    editM.mutate({ classroomId, fullName: fn, registrationCode: rc });
  }

  if (!open || !student) {
    return null;
  }

  return (
    <ModalFormShell
      open={open}
      title="Editar aluno"
      onClose={onClose}
      beforeDialog={<FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />}
    >
      <ModalFormPanel>
        <NewStudentForm
          classroomOptions={classroomOptions}
          classroomId={classroomId}
          onClassroomIdChange={setClassroomId}
          fullName={fullName}
          onFullNameChange={setFullName}
          registrationCode={registrationCode}
          onRegistrationCodeChange={setRegistrationCode}
          formError={formError}
          createM={editM}
          onSubmit={handleSubmit}
          submitLabel="Salvar alterações"
          pendingLabel="Salvando…"
        />
      </ModalFormPanel>
    </ModalFormShell>
  );
}
