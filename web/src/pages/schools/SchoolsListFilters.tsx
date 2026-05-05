export type SchoolsListFiltersProps = Readonly<{
  nameContains: string;
  onNameContainsChange: (v: string) => void;
}>;

export function SchoolsListFilters({ nameContains, onNameContainsChange }: SchoolsListFiltersProps) {
  return (
    <div className="form-grid classes-filters-grid">
      <label className="field field--span-2">
        <span className="field-label">Descrição (contém)</span>
        <input
          value={nameContains}
          onChange={(e) => onNameContainsChange(e.target.value)}
          placeholder="Nome da escola"
        />
      </label>
    </div>
  );
}
