import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ComponentProps, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { createClassroom } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { NewClassroomForm } from "./classes/NewClassroomForm";

export function ClassroomNewPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [schoolId, setSchoolId] = useState("");
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<"5" | "9">("5");
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;
  const isCoord = user?.role === "coordenador";
  const needsSchoolPicker = user && (user.role === "admin" || user.role === "gestor");

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: state.status === "authenticated" && Boolean(needsSchoolPicker),
  });

  const effectiveSchoolId = isCoord && user?.schoolId ? user.schoolId : schoolId;

  const createM = useMutation({
    mutationFn: createClassroom,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setPendingNavigate("/turmas");
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

  const schools = schoolsQ.data ?? [];

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      <section className="panel">
        <h2>Nova turma</h2>
        <p className="muted small">
          <Link to="/turmas">← Voltar</Link>
        </p>
        <p className="muted small">Escola, nome e ano. A importação por Excel fica na listagem de turmas.</p>

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
      </section>
    </div>
  );
}
