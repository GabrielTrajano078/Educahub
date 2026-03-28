import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";

export function SchoolsPage() {
  const q = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
  });

  return (
    <div>
      <section className="panel">
        <h2>Escolas</h2>
        <p className="muted small">Cadastro de escolas é feito pela API (POST /api/schools) ou seed.</p>
      </section>
      <section className="panel">
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {q.error instanceof ApiError ? q.error.message : "Erro."}
          </p>
        ) : null}
        {q.data && q.data.length > 0 ? (
          <ul className="list">
            {q.data.map((s) => (
              <li key={s._id}>
                <strong>{s.name}</strong>
                {s.city ? <span className="muted"> — {s.city}</span> : null}
                {" · "}
                <Link to={`/escola/resumo?schoolId=${s._id}`}>Resumo</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">Nenhuma escola.</p>
        )}
      </section>
    </div>
  );
}
