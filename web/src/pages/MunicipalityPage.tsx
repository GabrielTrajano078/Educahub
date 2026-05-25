import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { fetchMunicipalitySummary } from "@/api/results";
import { ApiError } from "@/lib/api-client";

export function MunicipalityPage() {
  const { state } = useAuth();
  const [code, setCode] = useState("");

  const user = state.status === "authenticated" ? state.user : null;
  const effectiveCode =
    user?.role === "gestor" && user.municipalityCode ? user.municipalityCode : code.trim();

  const q = useQuery({
    queryKey: ["municipality", effectiveCode],
    queryFn: () => fetchMunicipalitySummary(effectiveCode),
    enabled: Boolean(effectiveCode) && (user?.role === "gestor" || user?.role === "admin"),
  });

  if (state.status !== "authenticated") {
    return null;
  }

  const authUser = state.user;

  return (
    <div>
      <section className="panel">
        <h2>Painel do município</h2>
        {authUser.role === "admin" ? (
          <label className="field" style={{ maxWidth: 280 }}>
            Código IBGE do município
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex.: 3550308" />
          </label>
        ) : (
          <p className="muted small">Município vinculado ao perfil: {authUser.municipalityCode ?? "—"}</p>
        )}
      </section>
      <section className="panel">
        {!effectiveCode ? <p className="muted">Informe o código IBGE (admin).</p> : null}
        {q.isLoading ? <p className="muted">Carregando…</p> : null}
        {q.isError ? (
          <p className="error" role="alert">
            {q.error instanceof ApiError ? q.error.message : "Erro."}
          </p>
        ) : null}
        {q.data ? (
          <div>
            {q.data.schools.map((s) => (
              <div key={s.schoolId} style={{ marginBottom: "1.5rem" }}>
                <h3 style={{ marginBottom: "0.35rem" }}>
                  {s.name}{" "}
                  <Link to={`/escola/resumo?schoolId=${s.schoolId}`} className="small">
                    Resumo
                  </Link>
                </h3>
                <p className="small muted">Descritores críticos (&lt; 50%)</p>
                {s.criticalDescriptors.length === 0 ? (
                  <p className="muted small">Nenhum.</p>
                ) : (
                  <ul className="list small">
                    {s.criticalDescriptors.map((d) => (
                      <li key={d.descriptor}>
                        {d.descriptor}: {d.accuracy}% ({d.correct}/{d.total})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
