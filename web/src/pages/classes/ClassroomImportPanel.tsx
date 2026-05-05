import { useRef } from "react";
import { downloadClassroomTemplate } from "@/lib/excel-import";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import type { ClassroomImportReport } from "./classroom-import-workbook";

export type ClassroomImportPanelProps = {
  importBusy: boolean;
  importReport: ClassroomImportReport | null;
  chooseFileDisabled: boolean;
  onFile: (file: File) => void;
};

export function ClassroomImportPanel({
  importBusy,
  importReport,
  chooseFileDisabled,
  onFile,
}: ClassroomImportPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="classroom-import-panel">
      <h4 style={{ margin: "0 0 0.5rem", fontSize: "1rem", fontWeight: 600 }}>Importar turmas (Excel)</h4>
      <p className="muted small" style={{ margin: "0 0 0.75rem" }}>
        Planilha com colunas <strong>nome</strong> e <strong>ano</strong> (5 ou 9). Linhas vazias são ignoradas. As turmas são criadas na
        escola escolhida no filtro «Escola» (admin/gestor) ou na escola do seu perfil (coordenador).
      </p>
      <div className="import-toolbar">
        <button type="button" className="ghost" onClick={() => void downloadClassroomTemplate()}>
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

function ImportReportView({ report }: { report: ClassroomImportReport }) {
  return (
    <div className="import-report" role="status">
      <FeedbackMessage variant="success" className="small" role="status">
        {report.ok} turma(s) criada(s).
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
