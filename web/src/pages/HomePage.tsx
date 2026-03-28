import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";

export function HomePage() {
  const { state } = useAuth();
  const classesQuery = useQuery({
    queryKey: ["classes", "home"],
    queryFn: () => listClassrooms(),
    enabled: state.status === "authenticated",
  });
  const schoolsQuery = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: state.status === "authenticated" && (state.user.role === "admin" || state.user.role === "gestor"),
  });

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;

  return (
    <div>
      <section className="panel">
        <h2>Início</h2>
        <p className="muted">
          Fluxo: montar prova → publicar gabarito → gerar cartões → enviar foto do cartão → processar OMR → ver ranking e
          diagnóstico por turma.
        </p>
        <div className="row-actions">
          <Link to="/provas/nova" className="primary" style={{ textDecoration: "none", display: "inline-block" }}>
            Nova prova
          </Link>
          <Link to="/provas" className="ghost" style={{ textDecoration: "none", display: "inline-block" }}>
            Ver provas
          </Link>
          <Link to="/questoes" className="ghost" style={{ textDecoration: "none", display: "inline-block" }}>
            Banco de questões
          </Link>
        </div>
      </section>

      {user.role === "professor" || user.role === "coordenador" ? (
        <section className="panel">
          <h2>Suas turmas</h2>
          {classesQuery.isLoading ? <p className="muted">Carregando…</p> : null}
          {classesQuery.isError ? (
            <p className="error" role="alert">
              {classesQuery.error instanceof ApiError ? classesQuery.error.message : "Erro ao carregar turmas."}
            </p>
          ) : null}
          {classesQuery.data && classesQuery.data.length === 0 ? (
            <p className="muted">Nenhuma turma disponível para seu perfil.</p>
          ) : null}
          {classesQuery.data && classesQuery.data.length > 0 ? (
            <ul className="list">
              {classesQuery.data.map((c) => (
                <li key={c._id}>
                  <Link to={`/turma/${c._id}`}>
                    {c.name} ({c.grade}º ano)
                  </Link>
                  {" · "}
                  <Link to={`/alunos?classroomId=${c._id}`}>Alunos</Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {user.role === "admin" || user.role === "gestor" ? (
        <section className="panel">
          <h2>Escolas do município</h2>
          {schoolsQuery.isLoading ? <p className="muted">Carregando…</p> : null}
          {schoolsQuery.data && schoolsQuery.data.length > 0 ? (
            <ul className="list">
              {schoolsQuery.data.map((s) => (
                <li key={s._id}>
                  <strong>{s.name}</strong>
                  {s.city ? <span className="muted"> — {s.city}</span> : null}
                  {" · "}
                  <Link to={`/escola/resumo?schoolId=${s._id}`}>Resumo</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nenhuma escola listada.</p>
          )}
        </section>
      ) : null}
    </div>
  );
}
