import { SelectField } from "@/components/SelectField";
import { schoolDisplayName, type School } from "@/schemas/school";

export type ClassroomOption = Readonly<{ value: string; label: string }>;

export type StudentsListFiltersProps = Readonly<{
  showSchool: boolean;
  schools: readonly School[];
  schoolId: string;
  onSchoolIdChange: (v: string) => void;
  grade: string;
  onGradeChange: (v: string) => void;
  classroomId: string;
  onClassroomIdChange: (v: string) => void;
  classroomOptions: readonly ClassroomOption[];
  nameContains: string;
  onNameContainsChange: (v: string) => void;
}>;

export function StudentsListFilters({
  showSchool,
  schools,
  schoolId,
  onSchoolIdChange,
  grade,
  onGradeChange,
  classroomId,
  onClassroomIdChange,
  classroomOptions,
  nameContains,
  onNameContainsChange,
}: StudentsListFiltersProps) {
  return (
    <div className="form-grid classes-filters-grid">
      {showSchool ? (
        <SelectField
          label={<span className="field-label">Escola</span>}
          value={schoolId}
          onValueChange={onSchoolIdChange}
          options={schools.map((s) => ({ value: s._id, label: schoolDisplayName(s) }))}
          emptyOption={{ label: "Todas" }}
        />
      ) : null}
      <SelectField
        label={<span className="field-label">Ano</span>}
        value={grade}
        onValueChange={onGradeChange}
        options={[
          { value: "5", label: "5º" },
          { value: "9", label: "9º" },
        ]}
        emptyOption={{ label: "Todos" }}
      />
      <SelectField
        label={<span className="field-label">Turma</span>}
        className="field--span-2"
        value={classroomId}
        onValueChange={onClassroomIdChange}
        options={[...classroomOptions]}
        emptyOption={{ label: "Todos" }}
      />
      <label className="field field--span-2">
        <span className="field-label">Descrição (contém)</span>
        <input
          value={nameContains}
          onChange={(e) => onNameContainsChange(e.target.value)}
          placeholder="Nome do aluno"
        />
      </label>
    </div>
  );
}
