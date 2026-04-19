import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listQuestions } from "@/api/questions";
import { ApiError } from "@/lib/api-client";
import { disciplineLabel } from "@/lib/discipline";
import { axisLabel, CURRICULUM_AXIS_CODES, type CurriculumAxisCode } from "@/lib/curriculum-axis";

export function QuestionsPage() {
  const { state } = useAuth();
  const [discipline, setDiscipline] = useState<"" | "LP" | "MAT">("");
  const [grade, setGrade] = useState<"" | "5" | "9">("");
  const [framework, setFramework] = useState<"" | "SAEB">("");
  const [descriptor, setDescriptor] = useState("");
  const [axis, setAxis] = useState<"" | CurriculumAxisCode>("");

  const filters = useMemo(
    () => ({
      ...(discipline ? { discipline } : {}),
      ...(grade ? { grade } : {}),
      ...(framework ? { framework } : {}),
      ...(descriptor.trim() ? { descriptor: descriptor.trim() } : {}),
      ...(axis ? { axis } : {}),
    }),
    [discipline, grade, framework, descriptor, axis],
  );

  const q = useQuery({
    queryKey: ["questions", filters],
    queryFn: () => listQuestions(filters),
  });

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0 }}>Banco de questões</h2>
          {state.user.role === "admin" ? (
            <Link to="/questoes/nova" className="primary" style={{ textDecoration: "none" }}>
              Nova questão
            </Link>
          ) : null}
        </div>
        <p className="muted small">Professores visualizam e selecionam itens na criação da prova; apenas admin cadastra ou altera o banco.</p>

        <div className="form-grid" style={{ marginTop: "1rem", maxWidth: "100%", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
          <label className="field">
            Disciplina
            <select value={discipline} onChange={(e) => setDiscipline(e.target.value as typeof discipline)}>
              <option value="">Todas</option>
              <option value="LP">Língua Portuguesa</option>
              <option value="MAT">Matemática</option>
            </select>
          </label>
          <label className="field">
            Ano
            <select value={grade} onChange={(e) => setGrade(e.target.value as typeof grade)}>
              <option value="">Todos</option>
              <option value="5">5º</option>
              <option value="9">9º</option>
            </select>
          </label>
          <label className="field">
            Matriz
            <select value={framework} onChange={(e) => setFramework(e.target.value as typeof framework)}>
              <option value="">Todas</option>
              <option value="SAEB">SAEB</option>
            </select>
          </label>
          <label className="field" style={{ gridColumn: "span 2" }}>
            Descritor (contém)
            <input value={descriptor} onChange={(e) => setDescriptor(e.target.value)} placeholder="Ex.: D3" />
          </label>
          <label className="field" style={{ gridColumn: "span 2" }}>
            Eixo
            <select value={axis} onChange={(e) => setAxis(e.target.value as typeof axis)}>
              <option value="">Todos</option>
              {CURRICULUM_AXIS_CODES.map((code) => (
                <option key={code} value={code}>
                  {axisLabel(code)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {q.error instanceof ApiError ? q.error.message : "Erro ao listar questões."}
          </p>
        ) : null}
        {q.data && q.data.length === 0 ? <p className="muted">Nenhuma questão com esses filtros (máx. 200 itens).</p> : null}
        {q.data && q.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  <th>Série</th>
                  <th>Matriz</th>
                  <th>Descritor</th>
                  <th>Enunciado</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((row) => (
                  <tr key={row._id}>
                    <td>{disciplineLabel(row.discipline)}</td>
                    <td>{row.grade}</td>
                    <td>{row.framework}</td>
                    <td>{row.descriptor}</td>
                    <td style={{ maxWidth: 320 }}>{row.prompt.slice(0, 120)}{row.prompt.length > 120 ? "…" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
