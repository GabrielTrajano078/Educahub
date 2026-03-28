import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuestion, type CreateQuestionBody } from "@/api/questions";
import { ApiError } from "@/lib/api-client";

const AXES = [
  "",
  "LEITURA",
  "INTERPRETACAO",
  "GENEROS_TEXTUAIS",
  "LINGUA_ESTUDO",
  "NUMEROS",
  "ALGEBRA",
  "GEOMETRIA",
  "ESTATISTICA",
  "GRANDEZAS_MEDIDAS",
] as const;

export function QuestionNewPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState<CreateQuestionBody>({
    discipline: "LP",
    grade: "5",
    framework: "SAEB",
    descriptor: "",
    difficulty: "MEDIO",
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
      navigate("/questoes");
    },
    onError: (e: unknown) => {
      setErr(e instanceof ApiError ? e.message : "Falha ao criar.");
    },
  });

  return (
    <div>
      <section className="panel">
        <h2>Nova questão (admin)</h2>
        <p className="muted small">Campos obrigatórios alinhados ao banco SAEB/SPA-S.</p>
        {err ? (
          <p className="error" role="alert">
            {err}
          </p>
        ) : null}
        <form
          className="form-grid"
          style={{ maxWidth: 640, marginTop: "1rem" }}
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            m.mutate();
          }}
        >
          <label className="field">
            Disciplina
            <select
              value={form.discipline}
              onChange={(e) => setForm((f) => ({ ...f, discipline: e.target.value as CreateQuestionBody["discipline"] }))}
            >
              <option value="LP">LP</option>
              <option value="MAT">MAT</option>
            </select>
          </label>
          <label className="field">
            Ano
            <select
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value as CreateQuestionBody["grade"] }))}
            >
              <option value="5">5º</option>
              <option value="9">9º</option>
            </select>
          </label>
          <label className="field">
            Matriz
            <select
              value={form.framework}
              onChange={(e) => setForm((f) => ({ ...f, framework: e.target.value as CreateQuestionBody["framework"] }))}
            >
              <option value="SAEB">SAEB</option>
              <option value="SPAS">SPA-S</option>
            </select>
          </label>
          <label className="field">
            Dificuldade
            <select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value as CreateQuestionBody["difficulty"] }))}
            >
              <option value="FACIL">Fácil</option>
              <option value="MEDIO">Médio</option>
              <option value="DIFICIL">Difícil</option>
            </select>
          </label>
          <label className="field">
            Descritor / habilidade
            <input value={form.descriptor} onChange={(e) => setForm((f) => ({ ...f, descriptor: e.target.value }))} required minLength={1} />
          </label>
          <label className="field">
            Eixo (opcional)
            <select value={axis} onChange={(e) => setAxis(e.target.value)}>
              {AXES.map((a) => (
                <option key={a || "none"} value={a}>
                  {a || "—"}
                </option>
              ))}
            </select>
          </label>
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
          <label className="field">
            Gabarito
            <select
              value={form.answer}
              onChange={(e) => setForm((f) => ({ ...f, answer: e.target.value as CreateQuestionBody["answer"] }))}
            >
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="D">D</option>
            </select>
          </label>
          <div className="row-actions">
            <button type="submit" className="primary" disabled={m.isPending}>
              {m.isPending ? "Salvando…" : "Cadastrar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
