import type { Classroom } from "@/api/classes";
import { ModalFormPanel, ModalFormShell } from "@/components/ModalFormShell";

type ClassroomViewModalProps = Readonly<{
  open: boolean;
  classroom: Classroom | null;
  schoolName: string;
  onClose: () => void;
}>;

export function ClassroomViewModal({ open, classroom, schoolName, onClose }: ClassroomViewModalProps) {
  if (!open || !classroom) {
    return null;
  }

  return (
    <ModalFormShell open={open} title="Detalhes da turma" onClose={onClose}>
      <ModalFormPanel>
        <div className="form-grid question-new-form" style={{ marginTop: 0 }}>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Nome da turma</span>
            <p style={{ margin: "0.35rem 0 0" }}>{classroom.name}</p>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Ano</span>
            <p style={{ margin: "0.35rem 0 0" }}>{classroom.grade}º</p>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <span className="field-label">Escola</span>
            <p style={{ margin: "0.35rem 0 0" }}>{schoolName || "—"}</p>
          </div>
        </div>
      </ModalFormPanel>
    </ModalFormShell>
  );
}
