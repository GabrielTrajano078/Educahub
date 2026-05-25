import { SelectField } from "@/components/SelectField";
import type { School } from "@/schemas/school";

export type ClassesListFiltersProps = Readonly<{
  showSchool: boolean;
  schools: readonly School[];
  schoolId: string;
  onSchoolIdChange: (v: string) => void;
  grade: string;
  onGradeChange: (v: string) => void;
  nameContains: string;
  onNameContainsChange: (v: string) => void;
}>;

export function ClassesListFilters({
  showSchool,
  schools,
  schoolId,
  onSchoolIdChange,
  grade,
  onGradeChange,
  nameContains,
  onNameContainsChange,
}: ClassesListFiltersProps) {
  return (
    <div className="form-grid classes-filters-grid">
      {showSchool ? (
        <SelectField
          label={<span className="field-label">Escola</span>}
          value={schoolId}
          onValueChange={onSchoolIdChange}
          options={schools.map((s) => ({ value: s._id, label: s.normalizedName }))}
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
      <label className="field field--span-2">
        <span className="field-label">Descrição (contém)</span>
        <input
          value={nameContains}
          onChange={(e) => onNameContainsChange(e.target.value)}
          placeholder="Ex.: 5º A Manhã"
        />
      </label>
    </div>
  );
}
