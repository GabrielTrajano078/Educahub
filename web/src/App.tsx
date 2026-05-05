import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/auth/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { AppLayout } from "@/layout/AppLayout";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";
import { BootstrapPage } from "@/pages/BootstrapPage";
import { ClassroomPage } from "@/pages/ClassroomPage";
import { ClassesPage } from "@/pages/ClassesPage";
import { ClassroomNewPage } from "@/pages/ClassroomNewPage";
import { DashboardHomePage } from "@/pages/DashboardHomePage";
import { ExamDetailPage } from "@/pages/ExamDetailPage";
import { ExamNewPage } from "@/pages/ExamNewPage";
import { ExamsPage } from "@/pages/ExamsPage";
import { LoginPage } from "@/pages/LoginPage";
import { MunicipalityPage } from "@/pages/MunicipalityPage";
import { QuestionNewPage } from "@/pages/QuestionNewPage";
import { QuestionsPage } from "@/pages/QuestionsPage";
import { SchoolNewPage } from "@/pages/SchoolNewPage";
import { SchoolSummaryPage } from "@/pages/SchoolSummaryPage";
import { SchoolsPage } from "@/pages/SchoolsPage";
import { StudentNewPage } from "@/pages/StudentNewPage";
import { StudentsPage } from "@/pages/StudentsPage";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { RoleRoute } from "@/routes/RoleRoute";

export default function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <BrowserRouter>
          <ConfirmProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/bootstrap" element={<BootstrapPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardHomePage />} />
                <Route path="questoes" element={<QuestionsPage />} />
                <Route
                  path="questoes/nova"
                  element={
                    <RoleRoute allow={["admin"]}>
                      <QuestionNewPage />
                    </RoleRoute>
                  }
                />
                <Route path="provas" element={<ExamsPage />} />
                <Route path="provas/nova" element={<ExamNewPage />} />
                <Route path="provas/:id" element={<ExamDetailPage />} />
                <Route path="turmas" element={<ClassesPage />} />
                <Route
                  path="turmas/nova"
                  element={
                    <RoleRoute allow={["admin", "gestor", "coordenador"]}>
                      <ClassroomNewPage />
                    </RoleRoute>
                  }
                />
                <Route path="alunos" element={<StudentsPage />} />
                <Route
                  path="alunos/nova"
                  element={
                    <RoleRoute allow={["admin", "gestor", "coordenador", "professor"]}>
                      <StudentNewPage />
                    </RoleRoute>
                  }
                />
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
