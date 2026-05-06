import type { FormEvent } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { IbgeMunicipioOption } from "@/api/ibge";
import type { CreateSchoolBody } from "@/api/schools";
import { Button } from "@/components/ui/Button";
import { FeedbackMessage } from "@/components/ui/FeedbackMessage";

export type NewSchoolFormState = Readonly<{
  name: string;
  city: string;
  municipalityCode: string;
}>;

export type NewSchoolFormProps = Readonly<{
  isAdmin: boolean;
  gestorMunicipalityCode: string | null;
  form: NewSchoolFormState;
  onFormChange: (next: NewSchoolFormState) => void;
  onCityChange: (value: string) => void;
  citySuggestions: readonly IbgeMunicipioOption[];
  showCitySuggestions: boolean;
  citySuggestionsLoading: boolean;
  onSelectCitySuggestion: (option: IbgeMunicipioOption) => void;
  onCityFocus: () => void;
  onCityBlur: () => void;
  onMunicipalityCodeBlur: () => void;
  lookupBusy: boolean;
  formError: string | null;
  createM: UseMutationResult<{ id: string }, unknown, CreateSchoolBody, unknown>;
  onSubmit: (e: FormEvent) => void;
}>;

export function NewSchoolForm({
  isAdmin,
  gestorMunicipalityCode,
  form,
  onFormChange,
  onCityChange,
  citySuggestions,
  showCitySuggestions,
  citySuggestionsLoading,
  onSelectCitySuggestion,
  onCityFocus,
  onCityBlur,
  onMunicipalityCodeBlur,
  lookupBusy,
  formError,
  createM,
  onSubmit,
}: NewSchoolFormProps) {
  return (
    <form className="form-grid" style={{ maxWidth: 480, marginTop: "1rem" }} onSubmit={onSubmit}>
      <label className="field">
        <span className="field-label">Nome da escola</span>
        <input
          value={form.name}
          onChange={(e) => onFormChange({ ...form, name: e.target.value })}
          required
          minLength={2}
          placeholder="Ex.: EMEF José de Alencar"
          autoComplete="organization"
        />
      </label>
      <label className="field">
        <span className="field-label">Cidade (opcional)</span>
        <input
          value={form.city}
          onChange={(e) => onCityChange(e.target.value)}
          onFocus={onCityFocus}
          onBlur={onCityBlur}
          placeholder="Ex.: Fortaleza"
          autoComplete="address-level2"
          disabled={lookupBusy}
        />
        {showCitySuggestions && citySuggestionsLoading ? (
          <p className="muted small" style={{ marginTop: "0.5rem" }}>
            Buscando cidades...
          </p>
        ) : null}
        {showCitySuggestions && citySuggestions.length > 0 ? (
          <ul style={{ marginTop: "0.5rem", paddingLeft: 0, listStyle: "none" }}>
            {citySuggestions.map((item) => (
              <li key={item.codigo} style={{ marginBottom: "0.25rem" }}>
                <button
                  type="button"
                  className="ghost"
                  style={{ width: "100%", textAlign: "left" }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onSelectCitySuggestion(item);
                  }}
                >
                  {item.nome}
                  {item.uf ? `/${item.uf}` : ""} · IBGE {item.codigo}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </label>
      {isAdmin ? (
        <label className="field">
          <span className="field-label">Código IBGE do município (opcional)</span>
          <input
            value={form.municipalityCode}
            onChange={(e) =>
              onFormChange({
                ...form,
                municipalityCode: e.target.value.replaceAll(/\D/g, "").slice(0, 7),
              })
            }
            onBlur={onMunicipalityCodeBlur}
            placeholder="Ex.: 2304400"
            inputMode="numeric"
            disabled={lookupBusy}
          />
          <span className="muted small">Sete dígitos, ex.: Fortaleza — 2304400</span>
        </label>
      ) : gestorMunicipalityCode ? (
        <p className="muted small" style={{ margin: 0 }}>
          Município do cadastro: <strong>{gestorMunicipalityCode}</strong>
        </p>
      ) : null}

      {formError ? <FeedbackMessage variant="error">{formError}</FeedbackMessage> : null}

      <div className="row-actions">
        <Button type="submit" variant="primary" disabled={createM.isPending}>
          {createM.isPending ? "Salvando…" : "Cadastrar escola"}
        </Button>
      </div>
    </form>
  );
}
