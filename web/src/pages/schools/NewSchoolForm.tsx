import type { FormEvent } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
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
  formError: string | null;
  createM: UseMutationResult<{ id: string }, unknown, CreateSchoolBody, unknown>;
  onSubmit: (e: FormEvent) => void;
}>;

export function NewSchoolForm({
  isAdmin,
  gestorMunicipalityCode,
  form,
  onFormChange,
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
          onChange={(e) => onFormChange({ ...form, city: e.target.value })}
          placeholder="Ex.: Fortaleza"
          autoComplete="address-level2"
        />
      </label>
      {isAdmin ? (
        <label className="field">
          <span className="field-label">Código IBGE do município (opcional)</span>
          <input
            value={form.municipalityCode}
            onChange={(e) =>
              onFormChange({
                ...form,
                municipalityCode: e.target.value.replace(/\D/g, "").slice(0, 7),
              })
            }
            placeholder="Ex.: 2304400"
            inputMode="numeric"
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
