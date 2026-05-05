import type { FormEvent } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";

export type NewStudentFormPayload = Readonly<{
  classroomId: string;
  fullName: string;
  registrationCode: string;
}>;

export type NewStudentFormProps = Readonly<{
  classroomOptions: readonly { value: string; label: string }[];
  classroomId: string;
  onClassroomIdChange: (v: string) => void;
  fullName: string;
  onFullNameChange: (v: string) => void;
  registrationCode: string;
  onRegistrationCodeChange: (v: string) => void;
  formError: string | null;
  createM: UseMutationResult<{ id: string }, unknown, NewStudentFormPayload, unknown>;
  onSubmit: (e: FormEvent) => void;
}>;

export function NewStudentForm({
  classroomOptions,
  classroomId,
  onClassroomIdChange,
  fullName,
  onFullNameChange,
  registrationCode,
  onRegistrationCodeChange,
  formError,
  createM,
  onSubmit,
}: NewStudentFormProps) {
  return (
    <form className="form-grid" style={{ maxWidth: 480, marginTop: "1rem" }} onSubmit={onSubmit}>
      <SelectField
        label={<span className="field-label">Turma</span>}
        style={{ gridColumn: "1 / -1" }}
        value={classroomId}
        onValueChange={onClassroomIdChange}
        options={[...classroomOptions]}
        emptyOption={{ label: "Selecione…" }}
        required
      />
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span className="field-label">Nome completo</span>
        <input value={fullName} onChange={(e) => onFullNameChange(e.target.value)} required />
      </label>
      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span className="field-label">Código de matrícula</span>
        <input value={registrationCode} onChange={(e) => onRegistrationCodeChange(e.target.value)} required />
      </label>
      {formError ? (
        <FeedbackMessage variant="error" className="field--span-2">
          {formError}
        </FeedbackMessage>
      ) : null}
      <div className="row-actions" style={{ gridColumn: "1 / -1" }}>
        <Button type="submit" variant="primary" disabled={createM.isPending || !classroomId}>
          {createM.isPending ? "Salvando…" : "Cadastrar aluno"}
        </Button>
      </div>
    </form>
  );
}
