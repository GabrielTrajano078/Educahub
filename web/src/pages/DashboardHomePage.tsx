import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { listExams } from "@/api/exams";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/Button";
import { MetricCard } from "@/components/ui/MetricCard";

export function DashboardHomePage() {
  const { state } = useAuth();
  const classesQuery = useQuery({
    queryKey: ["classes", "dashboard"],
    queryFn: () => listClassrooms(),
    enabled: state.status === "authenticated",
  });
  const examsQuery = useQuery({
    queryKey: ["exams", "dashboard"],
    queryFn: () => listExams(),
    enabled: state.status === "authenticated",
  });
  const schoolsQuery = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: state.status === "authenticated" && (state.user.role === "admin" || state.user.role === "gestor"),
  });

  const provasEmCorrecao = useMemo(() => {
    const examList = examsQuery.data ?? [];
    return examList.filter((e) => {
      const s = (e.status ?? "DRAFT").toUpperCase();
      return s === "READY" || s === "APPLIED";
    });
  }, [examsQuery.data]);

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;
  const turmas = classesQuery.data?.length ?? "—";
  const provas = examsQuery.data?.length ?? "—";
  const escolas = schoolsQuery.data?.length ?? "—";

  return (
    <div>
      <section className="panel">
        <h2>Início</h2>
        <p className="muted">
          Fluxo: montar prova → publicar gabarito → gerar cartões → enviar foto do cartão → processar leitura → ver ranking e
          diagnóstico por turma.
        </p>

        <div className="metric-grid">
          <MetricCard label="Turmas acessíveis" value={turmas} detailTo="/turmas" detailLabel="Ver turmas" />
          <MetricCard label="Provas" value={provas} detailTo="/provas" detailLabel="Ver provas" />
          {user.role === "professor" || user.role === "coordenador" || user.role === "gestor" || user.role === "admin" ? (
            <MetricCard
              label="Provas em correção / leitura"
              value={provasEmCorrecao.length}
              detailTo="/provas"
              detailLabel="Ver lista"
            />
          ) : null}
          {user.role === "admin" || user.role === "gestor" ? (
            <MetricCard label="Escolas" value={escolas} detailTo="/escolas" detailLabel="Ver escolas" />
          ) : null}
          {user.role === "admin" ? (
            <MetricCard label="Banco de questões" value="—" detailTo="/questoes" detailLabel="Abrir banco" />
          ) : null}
        </div>

        <div className="row-actions dashboard-quick-actions">
          <Button asChild variant="primary">
            <Link to="/provas/nova">Nova prova</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/provas">Ver provas</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/questoes">Banco de questões</Link>
          </Button>
        </div>

        {provasEmCorrecao.length > 0 ? (
          <div className="dashboard-subsection" role="region" aria-labelledby="dash-provas-andamento">
            <h3 id="dash-provas-andamento">Provas em andamento</h3>
            <ul className="list">
              {provasEmCorrecao.slice(0, 12).map((e) => (
                <li key={e._id}>
                  <Link to={`/provas/${e._id}`}>{e.title}</Link>
                  {e.examCode ? <span className="muted small"> · {e.examCode}</span> : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {user.role === "professor" || user.role === "coordenador" ? (
        <section className="panel">
          <h2>Suas turmas</h2>
          {classesQuery.isLoading ? <p className="muted">Carregando…</p> : null}
          {classesQuery.isError ? (
            <p className="error" role="alert">
              {classesQuery.error instanceof ApiError ? classesQuery.error.message : "Não foi possível carregar as turmas."}
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
