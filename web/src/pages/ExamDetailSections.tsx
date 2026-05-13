import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { listClassrooms } from "@/api/classes";
import {
  fetchExam,
  generateAnswerSheets,
  listExamAnswerSheets,
  publishAnswerKey,
  uploadExamOriginalPdf,
} from "@/api/exams";
import { processAnswerSheetScan, uploadAnswerSheetScan } from "@/api/results";
import { BulkScanUpload } from "@/components/BulkScanUpload";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Stepper } from "@/components/ui/Stepper";
import { copy } from "@/lib/copy";
import { disciplineLabel } from "@/lib/discipline";
import { buildExamProgressSteps } from "@/lib/exam-progress";
import { formatApiError } from "@/lib/format-api-error";
import { pluralize } from "@/lib/pluralize";

export type ExamDetailSectionsProps = Readonly<{
  examId: string;
  /** Link «voltar» na página; no modal pode ser null. */
  breadcrumb: ReactNode | null;
  /** Desliga queries quando o modal está fechado. */
  enabled?: boolean;
}>;

export function ExamDetailSections({ examId, breadcrumb, enabled = true }: ExamDetailSectionsProps) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const examQ = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId),
    enabled: enabled && Boolean(examId),
  });

  const sheetsQ = useQuery({
    queryKey: ["exam-sheets", examId],
    queryFn: () => listExamAnswerSheets(examId),
    enabled: enabled && Boolean(examId) && Boolean(examQ.data),
  });

  const classesQ = useQuery({
    queryKey: ["classes", "exam-detail", examQ.data?.classroomId],
    queryFn: () => listClassrooms(),
    enabled: enabled && Boolean(examQ.data?.classroomId),
  });

  const classroomRow = useMemo(
    () => classesQ.data?.find((c) => c._id === examQ.data?.classroomId),
    [classesQ.data, examQ.data?.classroomId],
  );

  const publishM = useMutation({
    mutationFn: () => publishAnswerKey(examId),
    onSuccess: () => {
      setMsg("Gabarito publicado.");
      setErr(null);
      void qc.invalidateQueries({ queryKey: ["exam", examId] });
    },
    onError: (e: unknown) => {
      setErr(formatApiError(e, "Não foi possível publicar o gabarito."));
      setMsg(null);
    },
  });

  const pdfInputRef = useRef<HTMLInputElement>(null);

  const pdfM = useMutation({
    mutationFn: (file: File) => uploadExamOriginalPdf(examId, file),
    onSuccess: () => {
      setMsg(copy.examPdfUploaded);
      setErr(null);
      void qc.invalidateQueries({ queryKey: ["exam", examId] });
    },
    onError: (e: unknown) => {
      setErr(formatApiError(e, "Não foi possível enviar o PDF."));
      setMsg(null);
    },
  });

  const genM = useMutation({
    mutationFn: () => generateAnswerSheets(examId),
    onSuccess: (data) => {
      setMsg(`PDF com ${pluralize(data.totalSheets, "cartão-resposta gerado", "cartões-resposta gerados")}.`);
      setErr(null);
      void qc.invalidateQueries({ queryKey: ["exam-sheets", examId] });
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    },
    onError: (e: unknown) => {
      setErr(formatApiError(e, "Não foi possível gerar os cartões-resposta."));
      setMsg(null);
    },
  });

  const exam = examQ.data;

  const progressSteps = useMemo(
    () => (exam ? buildExamProgressSteps({ examStatus: exam.status, sheets: sheetsQ.data ?? [] }) : []),
    [exam, sheetsQ.data],
  );

  const scrollToFlow = (anchorId: string) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className="panel" id="exam-flow-root">
        {breadcrumb ? <p className="muted small">{breadcrumb}</p> : null}
        {examQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {examQ.isError ? (
          <p className="error" role="alert">
            {formatApiError(examQ.error, "Não foi possível carregar esta prova.")}
          </p>
        ) : null}
        {exam ? (
          <>
            <h2>{exam.title}</h2>
            <p className="muted">
              Código <span className="badge">{exam.examCode}</span> · {disciplineLabel(exam.discipline)} {exam.grade}º ·{" "}
              {exam.framework} · {exam.examType ?? "—"} · <StatusBadge status={exam.status} />
            </p>
            <p className="small">
              Turma:{" "}
              <Link to={`/turma/${exam.classroomId}`}>
                {classroomRow ? `${classroomRow.name} (${classroomRow.grade}º)` : "Abrir painel da turma"}
              </Link>
            </p>
            {msg ? <p className="success">{msg}</p> : null}
            {err ? (
              <p className="error" role="alert">
                {err}
              </p>
            ) : null}

            {progressSteps.length ? <Stepper steps={progressSteps} onStepClick={(aid) => scrollToFlow(aid)} /> : null}

            {(exam.sourceType ?? "QUESTION_BANK") === "PDF_IMPORT" ? (
              <div id="exam-flow-key">
                <p className="muted">{copy.pdfImportHint}</p>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) {
                      pdfM.mutate(file);
                    }
                  }}
                />
                <div className="row-actions">
                  <Button type="button" variant="primary" disabled={pdfM.isPending} onClick={() => pdfInputRef.current?.click()}>
                    {pdfM.isPending ? "Enviando…" : "Selecionar PDF da prova"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="row-actions" id="exam-flow-key">
                  <Button variant="primary" disabled={publishM.isPending} onClick={() => publishM.mutate()}>
                    {publishM.isPending ? "Publicando…" : "Publicar gabarito oficial"}
                  </Button>
                  <Button variant="ghost" disabled={genM.isPending} onClick={() => genM.mutate()}>
                    {genM.isPending ? "Gerando…" : "Gerar PDF dos cartões-resposta"}
                  </Button>
                </div>
                <p className="muted small">
                  Publique o gabarito antes da correção. Gere os cartões para cada aluno da turma; depois envie foto/scan e envie a leitura
                  automática dos cartões.
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
                        <td className="question-preview-cell-limit">
                          {q.prompt?.slice(0, 80) ?? (q.missing ? "—" : "")}…
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {(exam.sourceType ?? "QUESTION_BANK") === "PDF_IMPORT" ? (
              <>
                <div className="exam-flow-pdf-anchors muted small">
                  <p id="exam-flow-sheets" tabIndex={-1}>
                    Cartões-resposta em PDF não se aplicam a esta prova importada.
                  </p>
                  <p id="exam-flow-upload" tabIndex={-1}>
                    Use o envio do PDF original na seção acima.
                  </p>
                </div>
                <p id="exam-flow-results" className="muted small" tabIndex={-1}>
                  Resultados consolidados e ranking por turma ficam disponíveis após leituras e encerramento da prova.
                </p>
              </>
            ) : null}
          </>
        ) : null}
      </section>

      {exam && (exam.sourceType ?? "QUESTION_BANK") !== "PDF_IMPORT" ? (
        <section className="panel" id="exam-flow-sheets">
          <h3>Cartões-resposta</h3>
          <div id="exam-flow-upload">
            <BulkScanUpload
              sheets={sheetsQ.data ?? []}
              onDone={() => {
                void qc.invalidateQueries({ queryKey: ["exam-sheets", examId] });
                void qc.invalidateQueries({ queryKey: ["exam", examId] });
              }}
            />
          </div>
          {sheetsQ.isLoading ? <p className="muted">Carregando cartões…</p> : null}
          {sheetsQ.data && sheetsQ.data.length === 0 ? (
            <EmptyState
              title="Nenhum cartão-resposta gerado"
              description='Use o botão "Gerar PDF dos cartões-resposta" acima para criar os cartões da turma.'
            />
          ) : null}
          {sheetsQ.data && sheetsQ.data.length > 0 ? (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Código folha</th>
                    <th>Status</th>
                    <th>Leitura</th>
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
                            void qc.invalidateQueries({ queryKey: ["exam-sheets", examId] });
                            void qc.invalidateQueries({ queryKey: ["exam", examId] });
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <p id="exam-flow-results" className="muted small" tabIndex={-1}>
            Resultados consolidados e ranking por turma ficam disponíveis após leituras e encerramento da prova.
          </p>
        </section>
      ) : null}
    </>
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
            setLocalErr(formatApiError(err, "Não foi possível enviar ou processar a imagem do cartão."));
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
