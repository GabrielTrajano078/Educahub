import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { listExams } from "@/api/exams";
import { listSchools } from "@/api/schools";
import { fetchClassroomHeatmap, fetchClassroomRanking, fetchClassroomReport, fetchSchoolSummary } from "@/api/results";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";
import { SelectField } from "@/components/SelectField";
import { ApiError } from "@/lib/api-client";

type Tab = "ranking" | "heatmap" | "report";

export function SchoolSummaryPage() {
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const querySchoolId = sp.get("schoolId") ?? "";
  const [viewClassroomId, setViewClassroomId] = useState<string | null>(null);
  const [modalExamId, setModalExamId] = useState("");
  const [tab, setTab] = useState<Tab>("ranking");

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
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

  const allSummaryQ = useQuery({
    queryKey: ["school-summary", "all", (schoolsQ.data ?? []).map((s) => s._id).join(",")],
    queryFn: async () => {
      const schools = schoolsQ.data ?? [];
      const summaries = await Promise.all(
        schools.map(async (s) => {
          const summary = await fetchSchoolSummary(s._id);
          return {
            schoolId: s._id,
            schoolName: s.name,
            classrooms: summary.classrooms,
          };
        }),
      );
      return summaries;
    },
    enabled:
      !effectiveSchoolId &&
      state.status === "authenticated" &&
      (state.user.role === "admin" || state.user.role === "gestor") &&
      (schoolsQ.data?.length ?? 0) > 0,
  });

  const classesQ = useQuery({
    queryKey: ["classes", "school-summary-modal"],
    queryFn: () => listClassrooms(),
    enabled: Boolean(viewClassroomId) && state.status === "authenticated",
  });

  const modalClassroomMeta = useMemo(() => {
    if (!viewClassroomId) return null;
    const c = classesQ.data?.find((x) => x._id === viewClassroomId);
    if (!c) return null;
    const school = schoolsQ.data?.find((s) => s._id === c.schoolId);
    return { classroom: c, schoolName: school?.name };
  }, [classesQ.data, viewClassroomId, schoolsQ.data]);

  const modalExamsQ = useQuery({
    queryKey: ["exams", "school-summary-modal", viewClassroomId],
    queryFn: () => listExams({ classroomId: viewClassroomId! }),
    enabled: Boolean(viewClassroomId),
  });

  const rankingQ = useQuery({
    queryKey: ["ranking", "school-summary-modal", viewClassroomId, modalExamId],
    queryFn: () => fetchClassroomRanking(viewClassroomId!, modalExamId || undefined),
    enabled: Boolean(viewClassroomId) && tab === "ranking",
  });

  const heatmapQ = useQuery({
    queryKey: ["heatmap", "school-summary-modal", viewClassroomId, modalExamId],
    queryFn: () => fetchClassroomHeatmap(viewClassroomId!, modalExamId || undefined),
    enabled: Boolean(viewClassroomId) && tab === "heatmap",
  });

  const reportQ = useQuery({
    queryKey: ["report", "school-summary-modal", viewClassroomId, modalExamId],
    queryFn: () => fetchClassroomReport(viewClassroomId!, modalExamId || undefined),
    enabled: Boolean(viewClassroomId) && tab === "report",
  });

  if (state.status !== "authenticated") {
    return null;
  }
  const { user } = state;
  const showSchoolColumn = !effectiveSchoolId && (user.role === "admin" || user.role === "gestor");

  const rows = effectiveSchoolId
    ? (summaryQ.data?.classrooms ?? []).map((c) => ({
        ...c,
        schoolName: schoolsQ.data?.find((s) => s._id === effectiveSchoolId)?.name ?? "—",
      }))
    : (allSummaryQ.data ?? []).flatMap((schoolSummary) =>
        schoolSummary.classrooms.map((c) => ({
          ...c,
          schoolName: schoolSummary.schoolName,
        })),
      );

  return (
    <div>
      <ModalFormShell
        open={Boolean(viewClassroomId)}
        title="Painel completo da turma"
        onClose={() => {
          setViewClassroomId(null);
          setModalExamId("");
          setTab("ranking");
        }}
      >
        {viewClassroomId ? (
          <ModalFormPanel>
            <div>
              <h3 style={{ marginTop: 0 }}>
                {modalClassroomMeta
                  ? `${modalClassroomMeta.classroom.name} (${modalClassroomMeta.classroom.grade}º)${
                      modalClassroomMeta.schoolName ? ` · ${modalClassroomMeta.schoolName}` : ""
                    }`
                  : "Turma"}
              </h3>

              <SelectField
                label="Filtrar por prova"
                style={{ maxWidth: 420 }}
                value={modalExamId}
                onValueChange={setModalExamId}
                options={(modalExamsQ.data ?? []).map((e) => ({ value: e._id, label: `${e.title} (${e.examCode})` }))}
                emptyOption={{ label: "Todas" }}
              />

              <div className="tabs" role="tablist" style={{ marginTop: "1rem" }}>
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
                  {rankingQ.data && rankingQ.data.length > 0 ? (
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Aluno</th>
                            <th>Acertos</th>
                            <th>%</th>
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
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </ModalFormPanel>
        ) : null}
      </ModalFormShell>
      <section className="panel">
        <h2>Resumo da escola</h2>
        {user.role === "admin" || user.role === "gestor" ? (
          <SelectField
            label="Escola"
            style={{ maxWidth: 400 }}
            value={querySchoolId}
            onValueChange={(v) => {
              setSp(v ? { schoolId: v } : {});
            }}
            options={(schoolsQ.data ?? []).map((s) => ({ value: s._id, label: s.name }))}
            emptyOption={{ label: "Todas" }}
          />
        ) : (
          <p className="muted small">Escola vinculada ao seu usuário.</p>
        )}
      </section>

      <section className="panel">
        {!effectiveSchoolId && (user.role === "admin" || user.role === "gestor") ? (
          <p className="muted small">Mostrando todas as turmas com dados disponíveis.</p>
        ) : null}
        {summaryQ.isLoading || allSummaryQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {summaryQ.isError ? (
          <p className="error" role="alert">
            {summaryQ.error instanceof ApiError ? summaryQ.error.message : "Erro."}
          </p>
        ) : null}
        {allSummaryQ.isError ? (
          <p className="error" role="alert">
            {allSummaryQ.error instanceof ApiError ? allSummaryQ.error.message : "Erro."}
          </p>
        ) : null}
        {rows.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Turma</th>
                  <th>Ano</th>
                  {showSchoolColumn ? <th>Escola</th> : null}
                  <th>Média descritores</th>
                  <th className="col-actions">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={`${c.classroomId}-${c.schoolName}`}>
                    <td>{c.name}</td>
                    <td>{c.grade}º</td>
                    {showSchoolColumn ? <td>{c.schoolName}</td> : null}
                    <td>{c.meanAccuracyAcrossDescriptors}%</td>
                    <td className="col-actions">
                      <button
                        type="button"
                        className="ghost btn-compact"
                        onClick={() => setViewClassroomId(c.classroomId)}
                        aria-label={`Abrir painel da turma ${c.name}`}
                        title="Painel de dados"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M3 21h18" />
                          <rect x="5" y="11" width="3" height="7" rx="1" />
                          <rect x="10.5" y="7" width="3" height="11" rx="1" />
                          <rect x="16" y="4" width="3" height="14" rx="1" />
                        </svg>
                      </button>
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
