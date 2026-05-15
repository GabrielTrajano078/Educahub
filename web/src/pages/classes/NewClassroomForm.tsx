import type { ComponentProps } from "react";
import { SelectField } from "@/components/SelectField";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";
import type { School } from "@/schemas/school";
import type { User } from "@/schemas/auth";

export type NewClassroomFormProps = Readonly<{
  schools: School[];
  schoolId: string;
  onSchoolIdChange: (v: string) => void;
  name: string;
  onNameChange: (v: string) => void;
  grade: "5" | "9";
  onGradeChange: (v: "5" | "9") => void;
  needsSchoolPicker: boolean;
  isCoord: boolean;
  user: User;
  formError: string | null;
  createM: { isPending: boolean };
  onSubmit: NonNullable<ComponentProps<"form">["onSubmit"]>;
}>;

export function NewClassroomForm({
  schools,
  schoolId,
  onSchoolIdChange,
  name,
  onNameChange,
  grade,
  onGradeChange,
  needsSchoolPicker,
  isCoord,
  user,
  formError,
  createM,
  onSubmit,
}: NewClassroomFormProps) {
  const coordBlocked = isCoord && !user.schoolId;

  return (
    <form className="form-grid" style={{ maxWidth: 480, marginTop: "1rem" }} onSubmit={onSubmit}>
      {needsSchoolPicker ? (
        <SelectField
          label={<span className="field-label">Escola</span>}
          style={{ gridColumn: "1 / -1" }}
          value={schoolId}
          onValueChange={onSchoolIdChange}
          options={schools.map((s) => ({ value: s._id, label: s.name }))}
          emptyOption={{ label: "Selecione…" }}
          required
        />
      ) : null}
      {isCoord ? <CoordSchoolHint user={user} /> : null}

      <label className="field" style={{ gridColumn: "1 / -1" }}>
        <span className="field-label">Nome da turma</span>
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          required
          placeholder="Ex.: 5º A Manhã"
          disabled={coordBlocked}
        />
      </label>
      <SelectField
        label={<span className="field-label">Ano</span>}
        value={grade}
        onValueChange={(v) => onGradeChange(v as "5" | "9")}
        options={[
          { value: "5", label: "5º ano" },
          { value: "9", label: "9º ano" },
        ]}
        disabled={coordBlocked}
      />
      {formError ? (
        <FeedbackMessage variant="error" className="field--span-2">
          {formError}
        </FeedbackMessage>
      ) : null}
      <div className="row-actions" style={{ gridColumn: "1 / -1" }}>
        <Button type="submit" variant="primary" disabled={createM.isPending || coordBlocked}>
          {createM.isPending ? "Salvando…" : "Salvar turma"}
        </Button>
      </div>
    </form>
  );
}

function CoordSchoolHint({ user }: Readonly<{ user: User }>) {
  return (
    <p className="muted small" style={{ margin: 0, gridColumn: "1 / -1" }}>
      {user.schoolId ? (
        <>Turma será criada na escola vinculada ao seu perfil.</>
      ) : (
        <strong className="error">Seu usuário não tem escola vinculada — peça um administrador para vincular a escola ao seu perfil.</strong>
      )}
    </p>
  );
}
