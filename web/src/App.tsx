import { BrowserRouter, Navigate, Route, Routes, useSearchParams } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppLayout } from "@/layout/AppLayout";
import { ConfirmProvider } from "@/components/ui/ConfirmProvider";
import { BootstrapPage } from "@/pages/BootstrapPage";
import { ClassroomPage } from "@/pages/ClassroomPage";
import { ClassesPage } from "@/pages/ClassesPage";
import { DashboardHomePage } from "@/pages/DashboardHomePage";
import { ExamDetailPage } from "@/pages/ExamDetailPage";
import { ExamsPage } from "@/pages/ExamsPage";
import { LoginPage } from "@/pages/LoginPage";
import { MunicipalityPage } from "@/pages/MunicipalityPage";
import { QuestionsPage } from "@/pages/QuestionsPage";
import { SchoolNewPage } from "@/pages/SchoolNewPage";
import { SchoolSummaryPage } from "@/pages/SchoolSummaryPage";
import { SchoolsPage } from "@/pages/SchoolsPage";
import { StudentsPage } from "@/pages/StudentsPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";

function RedirectAlunosNova() {
  const [sp] = useSearchParams();
  const cid = sp.get("classroomId");
  const q = new URLSearchParams();
  q.set("nova", "1");
  if (cid) q.set("classroomId", cid);
  return <Navigate to={`/alunos?${q.toString()}`} replace />;
}

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<BootstrapPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHomePage />} />
                <Route path="questoes" element={<QuestionsPage />} />
                <Route path="provas" element={<ExamsPage />} />
                <Route path="provas/nova" element={<Navigate to="/provas?nova=1" replace />} />
                <Route path="provas/:id" element={<ExamDetailPage />} />
                <Route path="turmas" element={<ClassesPage />} />
                <Route path="turmas/nova" element={<Navigate to="/turmas?nova=1" replace />} />
                <Route path="alunos" element={<StudentsPage />} />
                <Route path="alunos/nova" element={<RedirectAlunosNova />} />
                <Route path="turma/:classroomId" element={<ClassroomPage />} />
                <Route path="escola/resumo" element={<SchoolSummaryPage />} />
                <Route
                  path="municipio"
                  element={
                    <RoleRoute allow={["admin", "gestor"]}>
                      <MunicipalityPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="escolas"
                  element={
                    <RoleRoute allow={["admin", "gestor"]}>
                      <SchoolsPage />
                    </RoleRoute>
                  }
                />
                <Route
                  path="escolas/nova"
                  element={
                    <RoleRoute allow={["admin", "gestor"]}>
                      <SchoolNewPage />
                    </RoleRoute>
                  }
                />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ConfirmProvider>
        </BrowserRouter>
      </AuthProvider>
    </QueryProvider>
  );
}
