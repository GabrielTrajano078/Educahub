import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

export function QuestionNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const [form, setForm] = useState<CreateQuestionBody>({
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
  });
  const [axis, setAxis] = useState<string>("");

  const m = useMutation({
    mutationFn: () =>
      createQuestion({
        ...form,
        ...(axis ? { axis } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["questions"] });
      setPendingNavigate("/questoes");
      setFeedback({ variant: "success", message: "Questão cadastrada com sucesso." });
    },
    onError: (e: unknown) => {
      setFeedback({ variant: "error", message: e instanceof ApiError ? e.message : "Falha ao criar." });
    },
  });

  function handleCloseFeedback() {
    setFeedback(null);
    if (pendingNavigate) {
      const to = pendingNavigate;
      setPendingNavigate(null);
      navigate(to);
    }
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      <section className="panel">
        <h2>Nova questão (admin)</h2>
        <p className="muted small">Campos obrigatórios alinhados à matriz SAEB.</p>
        <form
          className="form-grid"
          style={{ maxWidth: 640, marginTop: "1rem" }}
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
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
          <label className="field">
            Descritor / habilidade
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
            Enunciado
            <textarea value={form.prompt} onChange={(e) => setForm((f) => ({ ...f, prompt: e.target.value }))} required />
          </label>
          <label className="field">
            Alternativa A
            <input value={form.optionA} onChange={(e) => setForm((f) => ({ ...f, optionA: e.target.value }))} required />
          </label>
          <label className="field">
            Alternativa B
            <input value={form.optionB} onChange={(e) => setForm((f) => ({ ...f, optionB: e.target.value }))} required />
          </label>
          <label className="field">
            Alternativa C
            <input value={form.optionC} onChange={(e) => setForm((f) => ({ ...f, optionC: e.target.value }))} required />
          </label>
          <label className="field">
            Alternativa D
            <input value={form.optionD} onChange={(e) => setForm((f) => ({ ...f, optionD: e.target.value }))} required />
          </label>
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
      </section>
    </div>
  );
}
