import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { listClassrooms } from "@/api/classes";
import { createStudent, listStudents } from "@/api/students";
import { ApiError } from "@/lib/api-client";

export function StudentsPage() {
  const { state } = useAuth();
  const [sp, setSp] = useSearchParams();
  const classroomId = sp.get("classroomId") ?? "";
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [registrationCode, setRegistrationCode] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const user = state.status === "authenticated" ? state.user : null;

  const classesQ = useQuery({
    queryKey: ["classes", "students-page"],
    queryFn: () => listClassrooms(),
    enabled: !!user,
  });

  const selectedClass = useMemo(
    () => classesQ.data?.find((c) => c._id === classroomId),
    [classesQ.data, classroomId],
  );

  const studentsQ = useQuery({
    queryKey: ["students", classroomId],
    queryFn: () => listStudents({ classroomId }),
    enabled: Boolean(classroomId),
  });

  const createM = useMutation({
    mutationFn: () => {
      if (!selectedClass) {
        throw new Error("Selecione turma.");
      }
      return createStudent({
        schoolId: selectedClass.schoolId,
        classroomId: selectedClass._id,
        fullName: fullName.trim(),
        registrationCode: registrationCode.trim(),
      });
    },
    onSuccess: () => {
      setFullName("");
      setRegistrationCode("");
      setFormErr(null);
      void qc.invalidateQueries({ queryKey: ["students", classroomId] });
    },
    onError: (e: unknown) => {
      setFormErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Erro.");
    },
  });

  if (state.status !== "authenticated") {
    return null;
  }

  const authUser = state.user;
  const canCreate =
    authUser.role === "admin" ||
    authUser.role === "gestor" ||
    authUser.role === "coordenador" ||
    authUser.role === "professor";

  return (
    <div>
      <section className="panel">
        <h2>Alunos</h2>
        <label className="field" style={{ maxWidth: 400 }}>
          Turma
          <select
            value={classroomId}
            onChange={(e) => {
              setSp(e.target.value ? { classroomId: e.target.value } : {});
            }}
          >
            <option value="">Selecione…</option>
            {classesQ.data?.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.grade}º)
              </option>
            ))}
          </select>
        </label>
      </section>

      {canCreate && classroomId ? (
        <section className="panel">
          <h3>Cadastrar aluno</h3>
          {formErr ? (
            <p className="error" role="alert">
              {formErr}
            </p>
          ) : null}
          <div className="form-grid" style={{ maxWidth: 480 }}>
            <label className="field">
              Nome completo
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </label>
            <label className="field">
              Código de matrícula
              <input value={registrationCode} onChange={(e) => setRegistrationCode(e.target.value)} required />
            </label>
            <button type="button" className="primary" disabled={createM.isPending} onClick={() => createM.mutate()}>
              {createM.isPending ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="panel">
        {!classroomId ? <p className="muted">Escolha uma turma.</p> : null}
        {studentsQ.isLoading ? <p className="muted">Carregando…</p> : null}
        {studentsQ.isError ? (
          <p className="error" role="alert">
            {studentsQ.error instanceof ApiError ? studentsQ.error.message : "Erro."}
          </p>
        ) : null}
        {studentsQ.data && studentsQ.data.length === 0 && classroomId ? <p className="muted">Nenhum aluno nesta turma.</p> : null}
        {studentsQ.data && studentsQ.data.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Matrícula</th>
                </tr>
              </thead>
              <tbody>
                {studentsQ.data.map((s) => (
                  <tr key={s._id}>
                    <td>{s.fullName}</td>
                    <td>{s.registrationCode}</td>
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
