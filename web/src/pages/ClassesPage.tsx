import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { ClassesListFilters } from "./classes/ClassesListFilters";
import { ClassroomImportPanel } from "./classes/ClassroomImportPanel";
import {
  importClassroomsFromWorkbook,
  type ClassroomImportReport,
} from "./classes/classroom-import-workbook";
import { RegisteredClassesTable } from "./classes/RegisteredClassesTable";

export function ClassesPage() {
  const qc = useQueryClient();
  const { state } = useAuth();
  const [schoolFilter, setSchoolFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [nameContains, setNameContains] = useState("");
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ClassroomImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;
  const canCreate = user && (user.role === "admin" || user.role === "gestor" || user.role === "coordenador");
  const needsSchoolPicker = user && (user.role === "admin" || user.role === "gestor");
  const isCoord = user?.role === "coordenador";

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: state.status === "authenticated" && Boolean(needsSchoolPicker),
  });

  const listClassroomParams = useMemo(() => {
    const p: { schoolId?: string; grade?: "5" | "9"; nameContains?: string } = {};
    if (schoolFilter) p.schoolId = schoolFilter;
    if (gradeFilter === "5" || gradeFilter === "9") p.grade = gradeFilter;
    const q = nameContains.trim();
    if (q) p.nameContains = q;
    return Object.keys(p).length > 0 ? p : undefined;
  }, [schoolFilter, gradeFilter, nameContains]);

  const classesQ = useQuery({
    queryKey: ["classes", "page", schoolFilter, gradeFilter, nameContains],
    queryFn: () => listClassrooms(listClassroomParams),
    enabled: state.status === "authenticated",
  });

  const schoolNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of schoolsQ.data ?? []) {
      m.set(s._id, s.name);
    }
    return m;
  }, [schoolsQ.data]);

  function resolveSchoolIdForImport(): string | null {
    if (needsSchoolPicker) {
      return schoolFilter.trim() || null;
    }
    if (isCoord) {
      return user?.schoolId ?? null;
    }
    return null;
  }

  async function handleClassroomExcel(file: File) {
    const sid = resolveSchoolIdForImport();
    if (!sid) {
      setImportError(
        needsSchoolPicker
          ? "Selecione uma escola no filtro «Escola» acima (não use «Todas»)."
          : "Conta sem escola vinculada.",
      );
      return;
    }
    setImportBusy(true);
    setImportReport(null);
    setImportError(null);
    try {
      const report = await importClassroomsFromWorkbook(file, sid);
      setImportReport(report);
      if (report.ok > 0) {
        void qc.invalidateQueries({ queryKey: ["classes"] });
      }
    } catch {
      setImportError(
        "Não foi possível ler a planilha. Use .xlsx ou .xls e a primeira aba com colunas nome e ano.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  const importChooseDisabled =
    importBusy || Boolean(isCoord && !user?.schoolId) || Boolean(needsSchoolPicker && !schoolFilter.trim());

  if (state.status !== "authenticated") {
    return null;
  }

  const { user: u } = state;
  const schools = schoolsQ.data ?? [];

  return (
    <div>
      <section className="panel">
        <div className="section-header">
          <h2>Turmas</h2>
          {canCreate ? (
            <Button asChild variant="primary">
              <Link to="/turmas/nova">Nova turma</Link>
            </Button>
          ) : null}
        </div>
        <p className="muted small">
          Filtros por escola (admin/gestor), ano e descrição (nome da turma). Para importar Excel, admin e gestor devem escolher uma escola
          (não use «Todas»). Coordenador importa para a escola do perfil. Cadastro manual em Nova turma.
        </p>
        <ClassesListFilters
          showSchool={u.role === "admin" || u.role === "gestor"}
          schools={schools}
          schoolId={schoolFilter}
          onSchoolIdChange={setSchoolFilter}
          grade={gradeFilter}
          onGradeChange={setGradeFilter}
          nameContains={nameContains}
          onNameContainsChange={setNameContains}
        />

        {canCreate ? (
          <>
            {importError ? (
              <FeedbackMessage variant="error" className="small" role="alert">
                {importError}
              </FeedbackMessage>
            ) : null}
            <ClassroomImportPanel
              importBusy={importBusy}
              importReport={importReport}
              chooseFileDisabled={importChooseDisabled}
              onFile={(f) => void handleClassroomExcel(f)}
            />
          </>
        ) : null}

        {canCreate ? null : (
          <p className="muted small" style={{ marginTop: "1rem" }}>
            Apenas administrador, gestor ou coordenador podem cadastrar turmas.
          </p>
        )}
      </section>

      <section className="panel">
        <RegisteredClassesTable
          isLoading={classesQ.isLoading}
          isError={classesQ.isError}
          error={classesQ.error}
          classrooms={classesQ.data}
          schoolNameById={schoolNameById}
          user={u}
          canCreate={Boolean(canCreate)}
        />
      </section>
    </div>
  );
}
