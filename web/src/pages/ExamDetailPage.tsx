import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchExam, generateAnswerSheets, listExamAnswerSheets, publishAnswerKey } from "@/api/exams";
import { processAnswerSheetScan, uploadAnswerSheetScan } from "@/api/results";
import { ApiError } from "@/lib/api-client";

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const examQ = useQuery({
    queryKey: ["exam", id],
    queryFn: () => fetchExam(id!),
    enabled: Boolean(id),
  });

  const sheetsQ = useQuery({
    queryKey: ["exam-sheets", id],
    queryFn: () => listExamAnswerSheets(id!),
    enabled: Boolean(id) && Boolean(examQ.data),
  });

  const publishM = useMutation({
    mutationFn: () => publishAnswerKey(id!),
    onSuccess: () => {
      setMsg("Gabarito publicado.");
      setErr(null);
      void qc.invalidateQueries({ queryKey: ["exam", id] });
    },
    onError: (e: unknown) => {
      setErr(e instanceof ApiError ? e.message : "Falha ao publicar gabarito.");
      setMsg(null);
    },
  });

  const genM = useMutation({
    mutationFn: () => generateAnswerSheets(id!),
    onSuccess: (data) => {
      setMsg(`PDF com ${data.totalSheets} cartão(ões) gerado.`);
      setErr(null);
      void qc.invalidateQueries({ queryKey: ["exam-sheets", id] });
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (e: unknown) => {
      setErr(e instanceof ApiError ? e.message : "Falha ao gerar cartões.");
      setMsg(null);
    },
  });

  if (!id) {
    return <p className="error">Prova inválida.</p>;
  }

  const exam = examQ.data;

  return (
    <div>
      <section className="panel">
        <p className="muted small">
          <Link to="/provas">← Provas</Link>
        </p>
        {examQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {examQ.isError ? (
          <p className="error" role="alert">
            {examQ.error instanceof ApiError ? examQ.error.message : "Erro ao carregar prova."}
          </p>
        ) : null}
        {exam ? (
          <>
            <h2>{exam.title}</h2>
            <p className="muted">
              Código <span className="badge">{exam.examCode}</span> · {exam.discipline} {exam.grade}º · {exam.framework} ·{" "}
              {exam.examType ?? "—"} · Status {exam.status ?? "—"}
            </p>
            <p className="small">
              Turma: <Link to={`/turma/${exam.classroomId}`}>{exam.classroomId.slice(-6)}</Link>
            </p>
            {msg ? <p className="success">{msg}</p> : null}
            {err ? (
              <p className="error" role="alert">
                {err}
              </p>
            ) : null}

            {(exam.sourceType ?? "QUESTION_BANK") === "PDF_IMPORT" ? (
              <p className="muted">
                Prova importada por PDF: use o Swagger para enviar o arquivo original e configurar gabarito manualmente se
                necessário.
              </p>
            ) : (
              <>
                <div className="row-actions">
                  <button type="button" className="primary" disabled={publishM.isPending} onClick={() => publishM.mutate()}>
                    {publishM.isPending ? "Publicando…" : "Publicar gabarito oficial"}
                  </button>
                  <button type="button" className="ghost" disabled={genM.isPending} onClick={() => genM.mutate()}>
                    {genM.isPending ? "Gerando…" : "Gerar PDF dos cartões-resposta"}
                  </button>
                </div>
                <p className="muted small">
                  Publique o gabarito antes da correção. Gere os cartões para cada aluno da turma; depois envie foto/scan e
                  processe o OMR.
                </p>
              </>
            )}

            {exam.questions?.length ? (
              <div className="table-wrap">
                <h3 className="small">Questões na prova</h3>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Descritor</th>
                      <th>Prévia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exam.questions.map((q) => (
                      <tr key={q.order}>
                        <td>{q.order}</td>
                        <td>{q.descriptor ?? "—"}</td>
                        <td style={{ maxWidth: 280 }}>{q.prompt?.slice(0, 80) ?? (q.missing ? "—" : "")}…</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : null}
      </section>

      {exam && (exam.sourceType ?? "QUESTION_BANK") !== "PDF_IMPORT" ? (
        <section className="panel">
          <h3>Cartões-resposta</h3>
          {sheetsQ.isLoading ? <p className="muted">Carregando cartões…</p> : null}
          {sheetsQ.data && sheetsQ.data.length === 0 ? (
            <p className="muted">Nenhum cartão gerado ainda. Use &quot;Gerar PDF dos cartões-resposta&quot;.</p>
          ) : null}
          {sheetsQ.data && sheetsQ.data.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Código folha</th>
                    <th>Status</th>
                    <th>OMR</th>
                    <th>Enviar imagem</th>
                  </tr>
                </thead>
                <tbody>
                  {sheetsQ.data.map((s) => (
                    <tr key={s.id}>
                      <td>{s.studentSnapshot.fullName}</td>
                      <td className="small">{s.sheetCode}</td>
                      <td>{s.status}</td>
                      <td>{s.processingStatus}</td>
                      <td>
                        <ScanCell
                          answerSheetId={s.id}
                          onDone={() => {
                            void qc.invalidateQueries({ queryKey: ["exam-sheets", id] });
                            void qc.invalidateQueries({ queryKey: ["exam", id] });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ScanCell({ answerSheetId, onDone }: { answerSheetId: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState<string | null>(null);
  const [localOk, setLocalOk] = useState<string | null>(null);

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setBusy(true);
          setLocalErr(null);
          setLocalOk(null);
          try {
            const up = await uploadAnswerSheetScan(answerSheetId, file);
            const proc = await processAnswerSheetScan(answerSheetId, up.id, true);
            setLocalOk(`${proc.percentage}% · ${proc.correct}/${proc.totalEffective}`);
            onDone();
          } catch (err) {
            setLocalErr(err instanceof ApiError ? err.message : "Falha no upload/OMR.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {busy ? <span className="muted small">Processando…</span> : null}
      {localErr ? (
        <span className="error small" role="alert">
          {localErr}
        </span>
      ) : null}
      {localOk ? (
        <span className="success small" role="status">
          {localOk}
        </span>
      ) : null}
    </div>
  );
}
