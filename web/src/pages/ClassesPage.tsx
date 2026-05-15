import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { deleteClassroom, listClassrooms } from "@/api/classes";
import { listSchools } from "@/api/schools";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { ClassroomNewModal } from "@/pages/ClassroomNewPage";
import { ApiError } from "@/lib/api-client";
import { ClassesListFilters } from "./classes/ClassesListFilters";
import { ClassroomImportPanel } from "./classes/ClassroomImportPanel";
import { ClassroomViewModal } from "./classes/ClassroomViewModal";
import {
  importClassroomsFromWorkbook,
  type ClassroomImportReport,
} from "./classes/classroom-import-workbook";
import { RegisteredClassesTable } from "./classes/RegisteredClassesTable";

export function ClassesPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [schoolFilter, setSchoolFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [nameContains, setNameContains] = useState("");
  const [viewClassroomId, setViewClassroomId] = useState<string | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<ClassroomImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const deleteM = useMutation({
    mutationFn: (id: string) => deleteClassroom(id),
    onSuccess: () => {
      setDeleteErr(null);
      setFeedback({ variant: "success", message: "Turma excluída com sucesso." });
      void qc.invalidateQueries({ queryKey: ["classes"] });
    },
    onError: (e: unknown) => {
      setDeleteErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Não foi possível excluir.");
    },
  });

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

  const viewClassroom = useMemo(
    () => (viewClassroomId ? classesQ.data?.find((c) => c._id === viewClassroomId) ?? null : null),
    [classesQ.data, viewClassroomId],
  );

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
  const turmaCreateOpen = sp.get("nova") === "1";
  const turmaEditId = sp.get("edit")?.trim() || null;

  function openTurmaCreate() {
    const next = new URLSearchParams(sp);
    next.set("nova", "1");
    next.delete("edit");
    setSp(next, { replace: false });
  }

  function closeTurmaCreate() {
    const next = new URLSearchParams(sp);
    next.delete("nova");
    next.delete("edit");
    setSp(next, { replace: true });
  }

  function openTurmaEdit(id: string) {
    const next = new URLSearchParams(sp);
    next.set("edit", id);
    next.delete("nova");
    setSp(next, { replace: false });
  }

  function openTurmaView(id: string) {
    setViewClassroomId(id);
  }

  function closeTurmaView() {
    setViewClassroomId(null);
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      <ClassroomViewModal
        open={Boolean(viewClassroom)}
        classroom={viewClassroom}
        schoolName={viewClassroom ? schoolNameById.get(viewClassroom.schoolId) ?? "—" : ""}
        onClose={closeTurmaView}
      />
      {(turmaCreateOpen || turmaEditId) && canCreate ? (
        <ClassroomNewModal open onClose={closeTurmaCreate} classroomId={turmaEditId ?? undefined} />
      ) : null}
      <section className="panel">
        <div className="section-header">
          <h2>Turmas</h2>
          {canCreate ? (
            <Button type="button" variant="primary" onClick={openTurmaCreate}>
              Nova turma
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
        {deleteErr ? (
          <p className="error" role="alert">
            {deleteErr}
          </p>
        ) : null}
        <RegisteredClassesTable
          isLoading={classesQ.isLoading}
          isError={classesQ.isError}
          error={classesQ.error}
          classrooms={classesQ.data}
          schoolNameById={schoolNameById}
          user={u}
          canCreate={Boolean(canCreate)}
          onView={openTurmaView}
          onEdit={openTurmaEdit}
          onDelete={async (id, name) => {
            const ok = await confirm({
              title: "Excluir turma",
              description: `Excluir turma "${name}"? Esta ação não pode ser desfeita.`,
              variant: "danger",
              confirmLabel: "Excluir",
              cancelLabel: "Cancelar",
            });
            if (!ok) return;
            deleteM.mutate(id);
          }}
          deletePendingId={deleteM.isPending ? deleteM.variables : undefined}
        />
      </section>
    </div>
  );
}
