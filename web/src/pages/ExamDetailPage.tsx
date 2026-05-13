import { Link, useParams } from "react-router-dom";
import { ExamDetailSections } from "@/pages/ExamDetailSections";

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return <p className="error">Prova inválida.</p>;
  }

  return (
    <div>
      <ExamDetailSections examId={id} breadcrumb={<Link to="/provas">← Provas</Link>} />
    </div>
  );
}
