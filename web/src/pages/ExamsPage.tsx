import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listExams } from "@/api/exams";
import { ApiError } from "@/lib/api-client";

export function ExamsPage() {
  const { state } = useAuth();
  const q = useQuery({
    queryKey: ["exams"],
    queryFn: () => listExams(),
    enabled: state.status === "authenticated",
  });

  if (state.status !== "authenticated") {
    return null;
  }

  return (
    <div>
      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <h2 style={{ margin: 0 }}>Provas</h2>
          <Link to="/provas/nova" className="primary" style={{ textDecoration: "none" }}>
            Nova prova
          </Link>
        </div>
      </section>
      <section className="panel">
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {q.error instanceof ApiError ? q.error.message : "Erro ao listar provas."}
          </p>
        ) : null}
        {q.data && q.data.length === 0 ? <p className="muted">Nenhuma prova encontrada.</p> : null}
        {q.data && q.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Código</th>
                  <th>Disc. / Ano</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Qtd</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((e) => (
                  <tr key={e._id}>
                    <td>{e.title}</td>
                    <td>
                      <span className="badge">{e.examCode ?? "—"}</span>
                    </td>
                    <td>
                      {e.discipline} · {e.grade}º
                    </td>
                    <td>{e.examType ?? "—"}</td>
                    <td>{e.status ?? "—"}</td>
                    <td>{e.questionCount ?? "—"}</td>
                    <td>
                      <Link to={`/provas/${e._id}`}>Abrir</Link>
                    </td>
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
