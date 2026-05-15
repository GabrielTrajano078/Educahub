import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  createQuestion,
  fetchQuestion,
  updateQuestion,
  type CreateQuestionBody,
  type QuestionDetail,
  type UpdateQuestionBody,
} from "@/api/questions";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { SelectField, type SelectFieldOption } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { ApiError } from "@/lib/api-client";

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
  questionId?: string;
  onUpdated?: () => void;
  onCreated?: () => void;
}>;

function toForm(q: QuestionDetail): CreateQuestionBody {
  return {
    discipline: q.discipline,
    grade: q.grade,
    framework: q.framework,
    descriptor: q.descriptor,
    axis: q.axis,
    prompt: q.prompt,
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    answer: q.answer,
  };
}

function diffPayload(initial: CreateQuestionBody, current: CreateQuestionBody): UpdateQuestionBody {
  const next: UpdateQuestionBody = {};
  if (initial.discipline !== current.discipline) next.discipline = current.discipline;
  if (initial.grade !== current.grade) next.grade = current.grade;
  if ((initial.framework ?? "SAEB") !== (current.framework ?? "SAEB")) next.framework = current.framework;
  if (initial.descriptor !== current.descriptor) next.descriptor = current.descriptor;
  if ((initial.axis ?? "") !== (current.axis ?? "")) next.axis = current.axis;
  if (initial.prompt !== current.prompt) next.prompt = current.prompt;
  if (initial.optionA !== current.optionA) next.optionA = current.optionA;
  if (initial.optionB !== current.optionB) next.optionB = current.optionB;
  if (initial.optionC !== current.optionC) next.optionC = current.optionC;
  if (initial.optionD !== current.optionD) next.optionD = current.optionD;
  if (initial.answer !== current.answer) next.answer = current.answer;
  return next;
}

export function QuestionNewModal({ open, onClose, questionId, onUpdated, onCreated }: QuestionNewModalProps) {
  const qc = useQueryClient();
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [draft, setDraft] = useState<CreateQuestionBody>(INITIAL_FORM);
  const [isDirty, setIsDirty] = useState(false);
  const isEdit = Boolean(questionId);

  const detailQ = useQuery({
    queryKey: ["question", questionId],
    queryFn: () => fetchQuestion(questionId!),
    enabled: open && Boolean(questionId),
  });

  const baseForm = useMemo(
    () => (questionId && detailQ.data ? toForm(detailQ.data) : INITIAL_FORM),
    [questionId, detailQ.data],
  );
  const form = isDirty ? draft : baseForm;

  const m = useMutation({
    mutationFn: async () => {
      if (!questionId) {
        return createQuestion(form);
      }
      const payload = diffPayload(baseForm, form);
      if (Object.keys(payload).length === 0) {
        return { ok: true };
      }
      return updateQuestion(questionId, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["questions"] });
      void qc.invalidateQueries({ queryKey: ["question", questionId] });
      setFeedback({ variant: "success", message: isEdit ? "Questão atualizada com sucesso." : "Questão cadastrada com sucesso." });
    },
    onError: (e: unknown) => {
      setFeedback({ variant: "error", message: e instanceof ApiError ? e.message : isEdit ? "Falha ao atualizar." : "Falha ao criar." });
    },
  });

  function handleCloseFeedback() {
    const wasSuccess = feedback?.variant === "success";
    setFeedback(null);
    if (wasSuccess) {
      if (isEdit) onUpdated?.();
      else onCreated?.();
      onClose();
    }
  }

  if (!open) return null;

  return (
    <ModalFormShell
      open={open}
      title={isEdit ? "Editar questão" : "Nova questão"}
      onClose={onClose}
      beforeDialog={<FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />}
    >
      <ModalFormPanel intro={<p className="muted small" style={{ marginTop: 0 }}>Campos obrigatórios alinhados à matriz SAEB.</p>}>
        {detailQ.isLoading ? <p className="muted">Carregando…</p> : null}
        <form
          className="form-grid question-new-form"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <div className="question-new-meta-row">
            <SelectField
              label="Disciplina"
              value={form.discipline}
              onValueChange={(v) => {
                setIsDirty(true);
                setDraft((f) => ({ ...f, discipline: v as CreateQuestionBody["discipline"] }));
              }}
              options={DISCIPLINE_OPTIONS}
            />
            <SelectField
              label="Ano"
              value={form.grade}
              onValueChange={(v) => {
                setIsDirty(true);
                setDraft((f) => ({ ...f, grade: v as CreateQuestionBody["grade"] }));
              }}
              options={GRADE_OPTIONS}
            />
            <SelectField
              label="Matriz"
              value={form.framework ?? "SAEB"}
              onValueChange={(v) => {
                setIsDirty(true);
                setDraft((f) => ({ ...f, framework: v as "SAEB" }));
              }}
              options={[{ value: "SAEB", label: "SAEB" }]}
            />
          </div>
          <label className="field">
            <span>Descritor / habilidade</span>
            <input
              value={form.descriptor}
              onChange={(e) => {
                setIsDirty(true);
                setDraft((f) => ({ ...f, descriptor: e.target.value }));
              }}
              required
              minLength={1}
            />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            <span>Enunciado</span>
            <textarea
              value={form.prompt}
              onChange={(e) => {
                setIsDirty(true);
                setDraft((f) => ({ ...f, prompt: e.target.value }));
              }}
              required
            />
          </label>
          <div className="question-new-alternatives-row">
            <label className="field">
              <span>Alternativa A</span>
              <textarea
                value={form.optionA}
                onChange={(e) => {
                  setIsDirty(true);
                  setDraft((f) => ({ ...f, optionA: e.target.value }));
                }}
                required
                rows={3}
              />
            </label>
            <label className="field">
              <span>Alternativa B</span>
              <textarea
                value={form.optionB}
                onChange={(e) => {
                  setIsDirty(true);
                  setDraft((f) => ({ ...f, optionB: e.target.value }));
                }}
                required
                rows={3}
              />
            </label>
            <label className="field">
              <span>Alternativa C</span>
              <textarea
                value={form.optionC}
                onChange={(e) => {
                  setIsDirty(true);
                  setDraft((f) => ({ ...f, optionC: e.target.value }));
                }}
                required
                rows={3}
              />
            </label>
            <label className="field">
              <span>Alternativa D</span>
              <textarea
                value={form.optionD}
                onChange={(e) => {
                  setIsDirty(true);
                  setDraft((f) => ({ ...f, optionD: e.target.value }));
                }}
                required
                rows={3}
              />
            </label>
          </div>
          <SelectField
            label="Gabarito"
            value={form.answer}
            onValueChange={(v) => {
              setIsDirty(true);
              setDraft((f) => ({ ...f, answer: v as CreateQuestionBody["answer"] }));
            }}
            options={ANSWER_OPTIONS}
          />
          <div className="row-actions">
            <Button type="submit" variant="primary" disabled={m.isPending}>
              {m.isPending ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </ModalFormPanel>
    </ModalFormShell>
  );
}
