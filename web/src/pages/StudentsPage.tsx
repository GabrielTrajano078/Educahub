import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createStudent, deleteStudent, listStudents } from "@/api/students";
import { listSchools } from "@/api/schools";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import { useConfirm } from "@/components/ui/use-confirm";
import { TableActionIcon } from "@/components/table/TableActionIcons";
import { ApiError } from "@/lib/api-client";
import { parseStudentRow, readExcelFirstSheet } from "@/lib/excel-import";
import { StudentNewModal } from "@/pages/StudentNewPage";
import { StudentEditModal, StudentViewModal } from "@/pages/students/StudentDialogs";
import { StudentsListFilters } from "./students/StudentsListFilters";
import { StudentImportPanel, type StudentImportReport } from "./students/StudentImportPanel";

export function StudentsPage() {
  const { state } = useAuth();
  const confirm = useConfirm();
  const [sp, setSp] = useSearchParams();
  const classroomId = sp.get("classroomId") ?? "";
  const setClassroomId = (v: string) => {
    setSp(v ? { classroomId: v } : {}, { replace: true });
  };

  const qc = useQueryClient();
  const [schoolFilter, setSchoolFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [nameContains, setNameContains] = useState("");
  const [deleteErr, setDeleteErr] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importReport, setImportReport] = useState<StudentImportReport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;
  const needsSchoolPicker = user && (user.role === "admin" || user.role === "gestor");

  const schoolsQ = useQuery({
    queryKey: ["schools"],
    queryFn: () => listSchools(),
    enabled: Boolean(needsSchoolPicker && user),
  });

  const classesQ = useQuery({
    queryKey: ["classes", "students-page", schoolFilter, gradeFilter],
    queryFn: () =>
      listClassrooms({
        ...(schoolFilter ? { schoolId: schoolFilter } : {}),
        ...(gradeFilter === "5" || gradeFilter === "9" ? { grade: gradeFilter } : {}),
      }),
    enabled: Boolean(user),
  });

  const selectedClass = useMemo(
    () => (classroomId ? classesQ.data?.find((c) => c._id === classroomId) : undefined),
    [classesQ.data, classroomId],
  );

  const studentsQ = useQuery({
    queryKey: ["students", "list", schoolFilter, gradeFilter, classroomId, nameContains],
    queryFn: () =>
      listStudents({
        ...(schoolFilter ? { schoolId: schoolFilter } : {}),
        ...(gradeFilter === "5" || gradeFilter === "9" ? { grade: gradeFilter } : {}),
        ...(classroomId ? { classroomId } : {}),
        ...(nameContains.trim() ? { fullNameContains: nameContains.trim() } : {}),
      }),
    enabled: Boolean(user),
  });

  const classroomLabelById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of classesQ.data ?? []) {
      m.set(c._id, `${c.name} (${c.grade}º)`);
    }
    return m;
  }, [classesQ.data]);

  const deleteM = useMutation({
    mutationFn: (id: string) => deleteStudent(id),
    onSuccess: () => {
      setDeleteErr(null);
      setFeedback({ variant: "success", message: "Aluno excluído com sucesso." });
      void qc.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (e: unknown) => {
      setDeleteErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Não foi possível excluir.");
    },
  });

  const studentViewId = sp.get("ver")?.trim() || null;
  const studentEditId = sp.get("editar")?.trim() || null;
  const studentCreateOpen = sp.get("nova") === "1";

  const viewStudent = useMemo(
    () => (studentViewId ? studentsQ.data?.find((st) => st._id === studentViewId) ?? null : null),
    [studentsQ.data, studentViewId],
  );
  const editStudent = useMemo(
    () => (studentEditId ? studentsQ.data?.find((st) => st._id === studentEditId) ?? null : null),
    [studentsQ.data, studentEditId],
  );

  async function handleStudentExcel(file: File) {
    if (!selectedClass) {
      setImportError('Selecione uma turma específica no filtro «Turma» para importar (não use «Todos»).');
      return;
    }
    setImportBusy(true);
    setImportReport(null);
    setImportError(null);
    try {
      const rows = await readExcelFirstSheet(file);
      let ok = 0;
      let skipped = 0;
      const errors: { line: number; message: string }[] = [];
      for (let i = 0; i < rows.length; i++) {
        const line = i + 2;
        const row = rows[i];
        if (!row) {
          continue;
        }
        const parsed = parseStudentRow(row);
        if (parsed.kind === "empty") {
          skipped++;
          continue;
        }
        if (parsed.kind === "invalid") {
          errors.push({ line, message: parsed.reason });
          continue;
        }
        try {
          await createStudent({
            schoolId: selectedClass.schoolId,
            classroomId: selectedClass._id,
            fullName: parsed.fullName,
            registrationCode: parsed.registrationCode,
          });
          ok++;
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Não foi possível salvar esta linha.";
          errors.push({ line, message });
        }
      }
      setImportReport({ ok, skipped, errors });
      if (ok > 0) {
        void qc.invalidateQueries({ queryKey: ["students"] });
      }
    } catch {
      setImportError(
        "Não foi possível ler a planilha. Use .xlsx ou .xls e a primeira aba com colunas nome e matricula.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  if (state.status !== "authenticated") {
    return null;
  }

  const authUser = state.user;

  function openStudentCreate() {
    const next = new URLSearchParams(sp);
    next.set("nova", "1");
    next.delete("ver");
    next.delete("editar");
    setSp(next, { replace: false });
  }

  function closeStudentCreate() {
    const next = new URLSearchParams(sp);
    next.delete("nova");
    next.delete("ver");
    next.delete("editar");
    setSp(next, { replace: true });
  }

  function openStudentView(id: string) {
    const next = new URLSearchParams(sp);
    next.set("ver", id);
    next.delete("nova");
    next.delete("editar");
    setSp(next, { replace: false });
  }

  function closeStudentView() {
    const next = new URLSearchParams(sp);
    next.delete("ver");
    setSp(next, { replace: true });
  }

  function openStudentEdit(id: string) {
    const next = new URLSearchParams(sp);
    next.set("editar", id);
    next.delete("nova");
    next.delete("ver");
    setSp(next, { replace: false });
  }

  function closeStudentEdit() {
    const next = new URLSearchParams(sp);
    next.delete("editar");
    setSp(next, { replace: true });
  }

  const canCreate =
    authUser.role === "admin" ||
    authUser.role === "gestor" ||
    authUser.role === "coordenador" ||
    authUser.role === "professor";

  const classroomOptions = (classesQ.data ?? []).map((c) => ({
    value: c._id,
    label: `${c.name} (${c.grade}º)`,
  }));

  const importChooseDisabled = importBusy || !classroomId || !selectedClass;

  const schools = schoolsQ.data ?? [];

  const showTurmaColumn = !classroomId;

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
      {studentCreateOpen && canCreate ? (
        <StudentNewModal
          open
          onClose={closeStudentCreate}
          initialClassroomId={classroomId || undefined}
        />
      ) : null}
      <StudentViewModal
        open={Boolean(studentViewId && viewStudent)}
        student={viewStudent}
        turmaLabel={viewStudent ? classroomLabelById.get(viewStudent.classroomId) ?? "—" : ""}
        onClose={closeStudentView}
      />
      <StudentEditModal
        open={Boolean(studentEditId && editStudent)}
        student={editStudent}
        classroomOptions={classroomOptions}
        onClose={closeStudentEdit}
      />
      <section className="panel">
        <div className="section-header">
          <h2>Alunos</h2>
          {canCreate ? (
            <Button type="button" variant="primary" onClick={openStudentCreate}>
              Novo aluno
            </Button>
          ) : null}
        </div>
        <p className="muted small">
          Com «Turma» em Todos, a lista segue escola, ano e descrição. Para importar Excel, escolha uma turma específica. Cadastro manual em
          Novo aluno.
        </p>

        <StudentsListFilters
          showSchool={authUser.role === "admin" || authUser.role === "gestor"}
          schools={schools}
          schoolId={schoolFilter}
          onSchoolIdChange={setSchoolFilter}
          grade={gradeFilter}
          onGradeChange={setGradeFilter}
          classroomId={classroomId}
          onClassroomIdChange={setClassroomId}
          classroomOptions={classroomOptions}
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
            <StudentImportPanel
              importBusy={importBusy}
              importReport={importReport}
              chooseFileDisabled={importChooseDisabled}
              onFile={(f) => void handleStudentExcel(f)}
            />
          </>
        ) : null}
      </section>

      <section className="panel">
        {studentsQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {studentsQ.isError ? (
          <p className="error" role="alert">
            {studentsQ.error instanceof ApiError ? studentsQ.error.message : "Erro."}
          </p>
        ) : null}
        {!studentsQ.isLoading && studentsQ.data?.length === 0 ? (
          <EmptyState
            title="Nenhum aluno encontrado"
            description="Ajuste os filtros ou cadastre alunos em Novo aluno."
            action={
              canCreate ? (
                <Button type="button" variant="primary" onClick={openStudentCreate}>
                  Novo aluno
                </Button>
              ) : null
            }
          />
        ) : null}
        {deleteErr ? (
          <p className="error" role="alert">
            {deleteErr}
          </p>
        ) : null}
        {studentsQ.data && studentsQ.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  {showTurmaColumn ? <th>Turma</th> : null}
                  <th>Matrícula</th>
                  {canCreate ? <th className="col-actions">Ações</th> : null}
                </tr>
              </thead>
              <tbody>
                {studentsQ.data.map((s) => (
                  <tr key={s._id}>
                    <td>{s.fullName}</td>
                    {showTurmaColumn ? (
                      <td className="muted small">{classroomLabelById.get(s.classroomId) ?? "—"}</td>
                    ) : null}
                    <td>{s.registrationCode}</td>
                    {canCreate ? (
                      <td className="col-actions">
                        <button
                          type="button"
                          className="ghost btn-compact"
                          onClick={() => openStudentView(s._id)}
                          aria-label={`Ver ${s.fullName}`}
                          title="Ver detalhes"
                        >
                          <TableActionIcon name="open" />
                        </button>
                        <button
                          type="button"
                          className="ghost btn-compact"
                          onClick={() => openStudentEdit(s._id)}
                          aria-label={`Editar ${s.fullName}`}
                          title="Editar"
                        >
                          <TableActionIcon name="edit" />
                        </button>
                        <button
                          type="button"
                          className="btn-danger-text btn-compact"
                          disabled={deleteM.isPending}
                          aria-label={`Excluir ${s.fullName}`}
                          title="Excluir"
                          onClick={async () => {
                            const ok = await confirm({
                              title: "Excluir aluno",
                              description: `Excluir "${s.fullName}"? Esta ação não pode ser desfeita (inclui cartões e resultados vinculados).`,
                              variant: "danger",
                              confirmLabel: "Excluir",
                              cancelLabel: "Cancelar",
                            });
                            if (!ok) return;
                            deleteM.mutate(s._id);
                          }}
                        >
                          {deleteM.isPending && deleteM.variables === s._id ? "…" : <TableActionIcon name="delete" />}
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
