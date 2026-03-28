import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { listExams } from "@/api/exams";
import { fetchClassroomHeatmap, fetchClassroomRanking, fetchClassroomReport } from "@/api/results";
import { ApiError } from "@/lib/api-client";

type Tab = "ranking" | "heatmap" | "report";

export function ClassroomPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const [sp, setSp] = useSearchParams();
  const examId = sp.get("examId") ?? "";
  const [tab, setTab] = useState<Tab>("ranking");

  const examsQ = useQuery({
    queryKey: ["exams", "classroom", classroomId],
    queryFn: () => listExams({ classroomId: classroomId! }),
    enabled: Boolean(classroomId),
  });

  const rankingQ = useQuery({
    queryKey: ["ranking", classroomId, examId],
    queryFn: () => fetchClassroomRanking(classroomId!, examId || undefined),
    enabled: Boolean(classroomId) && tab === "ranking",
  });

  const heatmapQ = useQuery({
    queryKey: ["heatmap", classroomId, examId],
    queryFn: () => fetchClassroomHeatmap(classroomId!, examId || undefined),
    enabled: Boolean(classroomId) && tab === "heatmap",
  });

  const reportQ = useQuery({
    queryKey: ["report", classroomId, examId],
    queryFn: () => fetchClassroomReport(classroomId!, examId || undefined),
    enabled: Boolean(classroomId) && tab === "report",
  });

  if (!classroomId) {
    return <p className="error">Turma inválida.</p>;
  }

  return (
    <div>
      <section className="panel">
        <p className="muted small">
          <Link to="/turmas">← Turmas</Link>
        </p>
        <h2>Turma {classroomId.slice(-8)}</h2>
        <label className="field" style={{ maxWidth: 400 }}>
          Filtrar por prova (opcional)
          <select
            value={examId}
            onChange={(e) => {
              const v = e.target.value;
              setSp(v ? { examId: v } : {});
            }}
          >
            <option value="">Todas as provas com cartões nesta turma</option>
            {examsQ.data?.map((e) => (
              <option key={e._id} value={e._id}>
                {e.title} ({e.examCode})
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="panel">
        <div className="tabs" role="tablist">
          <button type="button" className="tab" aria-selected={tab === "ranking"} onClick={() => setTab("ranking")}>
            Ranking
          </button>
          <button type="button" className="tab" aria-selected={tab === "heatmap"} onClick={() => setTab("heatmap")}>
            Mapa de calor
          </button>
          <button type="button" className="tab" aria-selected={tab === "report"} onClick={() => setTab("report")}>
            Diagnóstico
          </button>
        </div>

        {tab === "ranking" ? (
          <>
            {rankingQ.isLoading ? <p className="muted">Carregando…</p> : null}
            {rankingQ.isError ? (
              <p className="error">{rankingQ.error instanceof ApiError ? rankingQ.error.message : "Erro"}</p>
            ) : null}
            {rankingQ.data && rankingQ.data.length === 0 ? (
              <p className="muted">Sem resultados tabulados ainda.</p>
            ) : null}
            {rankingQ.data && rankingQ.data.length > 0 ? (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Acertos</th>
                      <th>%</th>
                      <th>Cartão</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingQ.data.map((r) => (
                      <tr key={r.answerSheetId}>
                        <td>{r.studentName}</td>
                        <td>
                          {r.correct}/{r.totalEffective}
                        </td>
                        <td>{r.percentage}%</td>
                        <td className="small muted">{r.answerSheetId.slice(-6)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === "heatmap" ? (
          <>
            {heatmapQ.isLoading ? <p className="muted">Carregando…</p> : null}
            {heatmapQ.isError ? (
              <p className="error">{heatmapQ.error instanceof ApiError ? heatmapQ.error.message : "Erro"}</p>
            ) : null}
            {heatmapQ.data ? (
              <div>
                <p className="small muted">
                  Domínio ≥ {heatmapQ.data.masteryThreshold}% · fraco &lt; {heatmapQ.data.weakThreshold}%
                </p>
                <h4>Habilidades dominadas</h4>
                <p>{heatmapQ.data.dominated.length ? heatmapQ.data.dominated.join(", ") : "—"}</p>
                <h4>Em desenvolvimento</h4>
                <p>{heatmapQ.data.intermediate.length ? heatmapQ.data.intermediate.join(", ") : "—"}</p>
                <h4>Críticas</h4>
                <p>{heatmapQ.data.notDominated.length ? heatmapQ.data.notDominated.join(", ") : "—"}</p>
              </div>
            ) : null}
          </>
        ) : null}

        {tab === "report" ? (
          <>
            {reportQ.isLoading ? <p className="muted">Carregando…</p> : null}
            {reportQ.isError ? (
              <p className="error">{reportQ.error instanceof ApiError ? reportQ.error.message : "Erro"}</p>
            ) : null}
            {reportQ.data ? (
              <div>
                {reportQ.data.classroom ? (
                  <p>
                    <strong>{reportQ.data.classroom.name}</strong> · {reportQ.data.classroom.grade}º
                  </p>
                ) : null}
                <h4>Por eixo</h4>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Eixo</th>
                        <th>%</th>
                        <th>Itens</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportQ.data.byAxis.map((a) => (
                        <tr key={a.axis}>
                          <td>{a.axis}</td>
                          <td>{a.accuracy}%</td>
                          <td>
                            {a.correct}/{a.total}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4>Intervenções sugeridas</h4>
                {reportQ.data.interventions.length === 0 ? (
                  <p className="muted">Nenhuma sugestão automática.</p>
                ) : (
                  <ul className="list">
                    {reportQ.data.interventions.map((i) => (
                      <li key={i.descriptor}>
                        <strong>{i.descriptor}</strong>: {i.suggestion}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
