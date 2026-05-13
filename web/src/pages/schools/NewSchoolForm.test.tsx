import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewSchoolForm, type NewSchoolFormState } from "./NewSchoolForm";

const baseForm: NewSchoolFormState = {
  name: "",
  city: "",
  municipalityCode: "",
};

function renderForm(overrides: Partial<Parameters<typeof NewSchoolForm>[0]> = {}) {
  const onSubmit = vi.fn((e: FormEvent) => e.preventDefault());
  const onFormChange = vi.fn();
  const onCityChange = vi.fn();

  render(
    <NewSchoolForm
      isAdmin
      gestorMunicipalityCode={null}
      form={baseForm}
      onFormChange={onFormChange}
      onCityChange={onCityChange}
      citySuggestions={[]}
      showCitySuggestions={false}
      citySuggestionsLoading={false}
      onSelectCitySuggestion={vi.fn()}
      onCityFocus={vi.fn()}
      onCityBlur={vi.fn()}
      onMunicipalityCodeBlur={vi.fn()}
      lookupBusy={false}
      formError={null}
      createM={{ isPending: false } as never}
      onSubmit={onSubmit}
      {...overrides}
    />,
  );

  return { onSubmit, onFormChange, onCityChange };
}

describe("NewSchoolForm", () => {
  it("exibe campo de IBGE apenas para admin", () => {
    renderForm({ isAdmin: false, gestorMunicipalityCode: "2304400" });
    expect(screen.queryByLabelText("Código IBGE do município (opcional)")).not.toBeInTheDocument();
    expect(screen.getByText(/Município do cadastro:/)).toBeInTheDocument();
  });

  it("envia submit pelo botão Cadastrar escola", () => {
    const { onSubmit } = renderForm({
      form: { ...baseForm, name: "EMEF Centro" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cadastrar escola" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("sanitiza municipalityCode para apenas digitos", () => {
    const onFormChange = vi.fn();
    renderForm({
      form: { ...baseForm, municipalityCode: "" },
      onFormChange,
    });

    fireEvent.change(screen.getByPlaceholderText("Ex.: 2304400"), {
      target: { value: "23a04-400" },
    });

    expect(onFormChange).toHaveBeenCalledWith({
      ...baseForm,
      municipalityCode: "2304400",
    });
  });

  it("seleciona sugestão de cidade pelo mouse", () => {
    const onSelectCitySuggestion = vi.fn();

    renderForm({
      showCitySuggestions: true,
      citySuggestions: [{ codigo: "2304400", nome: "Fortaleza", uf: "CE" }],
      onSelectCitySuggestion,
    });

    fireEvent.mouseDown(screen.getByRole("button", { name: /Fortaleza\/CE/i }));

    expect(onSelectCitySuggestion).toHaveBeenCalledWith({
      codigo: "2304400",
      nome: "Fortaleza",
      uf: "CE",
    });
  });
});
