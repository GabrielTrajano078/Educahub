import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchExam } from "@/api/exams";
import { ModalFormShell } from "@/components/ModalFormShell";
import { ExamDetailSections } from "@/pages/ExamDetailSections";

type ExamDetailModalProps = Readonly<{
  open: boolean;
  examId: string | null;
  onClose: () => void;
}>;

export function ExamDetailModal({ open, examId, onClose }: ExamDetailModalProps) {
  const titleQ = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => fetchExam(examId!),
    enabled: open && Boolean(examId),
  });

  if (!open || !examId) {
    return null;
  }

  const title = titleQ.data?.title ?? "Detalhes da prova";

  return (
    <ModalFormShell open={open} title={title} onClose={onClose} dialogClassName="modal-dialog--exam-detail">
      <div className="exam-detail-modal-scroll">
        <p className="muted small" style={{ marginBottom: "0.75rem" }}>
          <Link to={`/provas/${examId}`}>Abrir em página completa</Link>
          {" · "}
          <Link to="/provas">Voltar à lista</Link>
        </p>
        <ExamDetailSections examId={examId} breadcrumb={null} enabled />
      </div>
    </ModalFormShell>
  );
}
