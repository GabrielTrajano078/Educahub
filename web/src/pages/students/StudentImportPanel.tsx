import { useRef } from "react";
import { downloadStudentTemplate } from "@/lib/excel-import";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";

export type StudentImportReport = {
  ok: number;
  skipped: number;
  errors: { line: number; message: string }[];
};

export type StudentImportPanelProps = Readonly<{
  importBusy: boolean;
  importReport: StudentImportReport | null;
  chooseFileDisabled: boolean;
  onFile: (file: File) => void;
}>;

export function StudentImportPanel({ importBusy, importReport, chooseFileDisabled, onFile }: StudentImportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="classroom-import-panel">
      <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Importar alunos (Excel)</h4>
      <p className="muted small" style={{ margin: "0 0 0.75rem" }}>
        Colunas <strong>nome</strong> e <strong>matricula</strong> (ou matrícula). Os alunos são cadastrados na turma selecionada no filtro
        «Turma».
      </p>
      <div className="import-toolbar">
        <button type="button" className="ghost" onClick={() => void downloadStudentTemplate()}>
          Baixar modelo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) {
              onFile(f);
            }
          }}
        />
        <Button type="button" variant="primary" disabled={chooseFileDisabled || importBusy} onClick={() => fileRef.current?.click()}>
          {importBusy ? "Importando…" : "Escolher planilha…"}
        </Button>
      </div>
      {importReport ? <ImportReportView report={importReport} /> : null}
    </div>
  );
}

function ImportReportView({ report }: { report: StudentImportReport }) {
  return (
    <div className="import-report" role="status">
      <FeedbackMessage variant="success" className="small" role="status">
        {report.ok} aluno(s) cadastrado(s).
      </FeedbackMessage>
      {report.skipped > 0 ? (
        <FeedbackMessage variant="warning" className="small" role="status">
          {report.skipped} linha(s) em branco ignorada(s).
        </FeedbackMessage>
      ) : null}
      {report.errors.length === 0 ? null : (
        <>
          <FeedbackMessage variant="error" className="small" role="alert">
            {report.errors.length} linha(s) com problema:
          </FeedbackMessage>
          <ul className="small muted" style={{ margin: "0.35rem 0 0" }}>
            {report.errors.slice(0, 25).map((e) => (
              <li key={`${e.line}-${e.message}`}>
                Linha {e.line}: {e.message}
              </li>
            ))}
            {report.errors.length > 25 ? <li>… e mais {report.errors.length - 25}.</li> : null}
          </ul>
        </>
      )}
    </div>
  );
}
