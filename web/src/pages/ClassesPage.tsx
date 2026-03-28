import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { useState } from "react";

export function ClassesPage() {
  const { state } = useAuth();
  const [schoolFilter, setSchoolFilter] = useState("");

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: listSchools,
    enabled: state.status === "authenticated" && (state.user.role === "admin" || state.user.role === "gestor"),
  });

  const classesQ = useQuery({
    queryKey: ["classes", "page", schoolFilter],
    queryFn: () => listClassrooms(schoolFilter ? { schoolId: schoolFilter } : undefined),
    enabled: state.status === "authenticated",
  });

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;

  return (
    <div>
      <section className="panel">
        <h2>Turmas</h2>
        {user.role === "admin" || user.role === "gestor" ? (
          <label className="field" style={{ maxWidth: 360, marginTop: "0.75rem" }}>
            Filtrar por escola
            <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)}>
              <option value="">Todas (gestor: município)</option>
              {schoolsQ.data?.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>
      <section className="panel">
        {classesQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {classesQ.isError ? (
          <p className="error" role="alert">
            {classesQ.error instanceof ApiError ? classesQ.error.message : "Erro."}
          </p>
        ) : null}
        {classesQ.data && classesQ.data.length === 0 ? <p className="muted">Nenhuma turma.</p> : null}
        {classesQ.data && classesQ.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Ano</th>
                  <th>Escola (id)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classesQ.data.map((c) => (
                  <tr key={c._id}>
                    <td>{c.name}</td>
                    <td>{c.grade}º</td>
                    <td className="small muted">{c.schoolId.slice(-8)}</td>
                    <td>
                      <Link to={`/turma/${c._id}`}>Painel</Link>
                      {" · "}
                      <Link to={`/alunos?classroomId=${c._id}`}>Alunos</Link>
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
