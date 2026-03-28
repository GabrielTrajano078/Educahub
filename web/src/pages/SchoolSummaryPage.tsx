import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listSchools } from "@/api/schools";
import { fetchSchoolSummary } from "@/api/results";
import { ApiError } from "@/lib/api-client";

export function SchoolSummaryPage() {
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const querySchoolId = sp.get("schoolId") ?? "";

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: state.status === "authenticated" && (state.user.role === "admin" || state.user.role === "gestor"),
  });

  const effectiveSchoolId = useMemo(() => {
    if (state.status !== "authenticated") {
      return "";
    }
    const { user } = state;
    if (user.role === "professor" || user.role === "coordenador") {
      return user.schoolId ?? "";
    }
    return querySchoolId;
  }, [state, querySchoolId]);

  const summaryQ = useQuery({
    queryKey: ["school-summary", effectiveSchoolId],
    queryFn: () => fetchSchoolSummary(effectiveSchoolId),
    enabled: Boolean(effectiveSchoolId),
  });

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;

  return (
    <div>
      <section className="panel">
        <h2>Resumo da escola</h2>
        {user.role === "admin" || user.role === "gestor" ? (
          <label className="field" style={{ maxWidth: 400 }}>
            Escola
            <select
              value={querySchoolId}
              onChange={(e) => {
                const v = e.target.value;
                setSp(v ? { schoolId: v } : {});
              }}
            >
              <option value="">Selecione…</option>
              {schoolsQ.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="muted small">Escola vinculada ao seu usuário.</p>
        )}
      </section>

      <section className="panel">
        {!effectiveSchoolId ? <p className="muted">Selecione uma escola.</p> : null}
        {summaryQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {summaryQ.isError ? (
          <p className="error" role="alert">
            {summaryQ.error instanceof ApiError ? summaryQ.error.message : "Erro."}
          </p>
        ) : null}
        {summaryQ.data ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Ano</th>
                  <th>Média descritores</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {summaryQ.data.classrooms.map((c) => (
                  <tr key={c.classroomId}>
                    <td>{c.name}</td>
                    <td>{c.grade}º</td>
                    <td>{c.meanAccuracyAcrossDescriptors}%</td>
                    <td>
                      <Link to={`/turma/${c.classroomId}`}>Painel turma</Link>
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
