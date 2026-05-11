import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import { createQuestion, type CreateQuestionBody } from "@/api/questions";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { ApiError } from "@/lib/api-client";
import { axisLabel, CURRICULUM_AXIS_CODES } from "@/lib/curriculum-axis";

const DISCIPLINE_OPTIONS: SelectFieldOption[] = [
  { value: "LP", label: "Língua Portuguesa" },
  { value: "MAT", label: "Matemática" },
];

const GRADE_OPTIONS: SelectFieldOption[] = [
  { value: "5", label: "5º" },
  { value: "9", label: "9º" },
];

const ANSWER_OPTIONS: SelectFieldOption[] = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
];

const AXIS_OPTIONS: SelectFieldOption[] = CURRICULUM_AXIS_CODES.map((code) => ({
  value: code,
  label: axisLabel(code),
}));

const INITIAL_FORM: CreateQuestionBody = {
  discipline: "LP",
  grade: "5",
  framework: "SAEB",
  descriptor: "",
  prompt: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  answer: "A",
};

type QuestionNewModalProps = Readonly<{
  open: boolean;
  onClose: () => void;
}>;

export function QuestionNewModal({ open, onClose }: QuestionNewModalProps) {
  const qc = useQueryClient();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [form, setForm] = useState<CreateQuestionBody>(INITIAL_FORM);
  const [axis, setAxis] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    globalThis.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      globalThis.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const m = useMutation({
    mutationFn: () =>
      createQuestion({
        ...form,
        ...(axis ? { axis } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["questions"] });
      setFeedback({ variant: "success", message: "Questão cadastrada com sucesso." });
    },
    onError: (e: unknown) => {
      setFeedback({ variant: "error", message: e instanceof ApiError ? e.message : "Falha ao criar." });
    },
  });

  function handleCloseFeedback() {
    const wasSuccess = feedback?.variant === "success";
    setFeedback(null);
    if (wasSuccess) {
      onClose();
    }
  }

  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      <dialog open className="modal-dialog modal-dialog--question-new" aria-labelledby={titleId}>
        <header className="modal-header">
          <h2 id={titleId} className="modal-title">
            Nova questão
          </h2>
          <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </header>
        <div className="modal-body">
          <p className="muted small">Campos obrigatórios alinhados à matriz SAEB.</p>
          <form
            className="form-grid question-new-form"
            style={{ marginTop: "1rem" }}
            onSubmit={(e) => {
              e.preventDefault();
              m.mutate();
            }}
          >
            <div className="question-new-meta-row">
              <SelectField
                label="Disciplina"
                value={form.discipline}
                onValueChange={(v) => setForm((f) => ({ ...f, discipline: v as CreateQuestionBody["discipline"] }))}
                options={DISCIPLINE_OPTIONS}
              />
              <SelectField
                label="Ano"
                value={form.grade}
                onValueChange={(v) => setForm((f) => ({ ...f, grade: v as CreateQuestionBody["grade"] }))}
                options={GRADE_OPTIONS}
              />
              <SelectField
                label="Matriz"
                value={form.framework ?? "SAEB"}
                onValueChange={(v) => setForm((f) => ({ ...f, framework: v as "SAEB" }))}
                options={[{ value: "SAEB", label: "SAEB" }]}
              />
            </div>
            <label className="field">
              <span>Descritor / habilidade</span>
              <input value={form.descriptor} onChange={(e) => setForm((f) => ({ ...f, descriptor: e.target.value }))} required minLength={1} />
            </label>
            <SelectField
              label="Eixo (opcional)"
              value={axis}
              onValueChange={setAxis}
              options={AXIS_OPTIONS}
              emptyOption={{ label: "nenhum" }}
            />
            <label className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Enunciado</span>
              <textarea value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} required />
            </label>
            <div className="question-new-alternatives-row">
              <label className="field">
                <span>Alternativa A</span>
                <textarea value={form.optionA} onChange={(e) => setForm((f) => ({ ...f, optionA: e.target.value }))} required rows={3} />
              </label>
              <label className="field">
                <span>Alternativa B</span>
                <textarea value={form.optionB} onChange={(e) => setForm((f) => ({ ...f, optionB: e.target.value }))} required rows={3} />
              </label>
              <label className="field">
                <span>Alternativa C</span>
                <textarea value={form.optionC} onChange={(e) => setForm((f) => ({ ...f, optionC: e.target.value }))} required rows={3} />
              </label>
              <label className="field">
                <span>Alternativa D</span>
                <textarea value={form.optionD} onChange={(e) => setForm((f) => ({ ...f, optionD: e.target.value }))} required rows={3} />
              </label>
            </div>
            <SelectField
              label="Gabarito"
              value={form.answer}
              onValueChange={(v) => setForm((f) => ({ ...f, answer: v as CreateQuestionBody["answer"] }))}
              options={ANSWER_OPTIONS}
            />
            <div className="row-actions">
              <Button type="submit" variant="primary" disabled={m.isPending}>
                {m.isPending ? "Salvando…" : "Cadastrar"}
              </Button>
            </div>
          </form>
        </div>
      </dialog>
    </div>
  );
}
