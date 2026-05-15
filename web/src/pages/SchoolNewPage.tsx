import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { fetchMunicipioByIbgeCode, searchMunicipiosByName, type IbgeMunicipioOption } from "@/api/ibge";
import { createSchool, fetchSchool, updateSchool, type CreateSchoolBody } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { NewSchoolForm, type NewSchoolFormState } from "./schools/NewSchoolForm";

export function SchoolNewPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const { state } = useAuth();
  const [form, setForm] = useState<NewSchoolFormState>({
    name: "",
    city: "",
    municipalityCode: "",
  });
  const [isDirty, setIsDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const user = state.status === "authenticated" ? state.user : null;
  const isAdmin = user?.role === "admin";
  const schoolId = sp.get("edit")?.trim() || null;
  const isEdit = Boolean(schoolId);

  const detailQ = useQuery({
    queryKey: ["school", schoolId],
    queryFn: () => fetchSchool(schoolId!),
    enabled: state.status === "authenticated" && Boolean(schoolId),
  });

  const baseForm = useMemo<NewSchoolFormState>(
    () => ({
      name: detailQ.data?.name ?? "",
      city: detailQ.data?.city ?? "",
      municipalityCode: detailQ.data?.municipalityCode ?? "",
    }),
    [detailQ.data],
  );
  const formState = isDirty ? form : baseForm;

  const createM = useMutation({
    mutationFn: async (body: CreateSchoolBody) => {
      if (!schoolId) return createSchool(body);
      await updateSchool(schoolId, body);
      return { id: schoolId };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["schools"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setPendingNavigate("/escolas");
      setFeedback({ variant: "success", message: isEdit ? "Escola atualizada com sucesso." : "Escola cadastrada com sucesso." });
    },
    onError: (err: unknown) => {
      setFeedback({
        variant: "error",
        message: err instanceof ApiError ? err.message : isEdit ? "Não foi possível atualizar." : "Não foi possível cadastrar.",
      });
    },
  });

  const lookupMunicipioM = useMutation({
    mutationFn: fetchMunicipioByIbgeCode,
    onSuccess: (data) => {
      setIsDirty(true);
      setForm((prev) => ({ ...prev, city: data.nome }));
    },
    onError: (err: unknown) => {
      setFeedback({
        variant: "error",
        message: err instanceof Error ? err.message : "Não foi possível consultar o IBGE.",
      });
    },
  });

  const cityInput = formState.city;
  const cityQueryValue = cityInput.trim();

  const citySearchQ = useQuery({
    queryKey: ["ibge", "city-search", cityQueryValue],
    queryFn: () => searchMunicipiosByName(cityQueryValue),
    enabled: Boolean(isAdmin && cityQueryValue.length >= 3),
    staleTime: 5 * 60 * 1000,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmed = formState.name.trim();
    if (trimmed.length < 2) {
      setFeedback({ variant: "warning", message: "Informe o nome da escola (mínimo 2 caracteres)." });
      return;
    }

    const body: CreateSchoolBody = { name: trimmed };
    const city = formState.city.trim();
    if (city.length >= 2) {
      body.city = city;
    }
    if (isAdmin) {
      const mc = formState.municipalityCode.trim();
      if (mc.length >= 2) {
        body.municipalityCode = mc;
      }
    }

    createM.mutate(body);
  }

  function handleLookupByCode() {
    const code = formState.municipalityCode.trim();
    if (code.length !== 7) {
      return;
    }
    lookupMunicipioM.mutate(code);
  }

  function handleSelectCitySuggestion(option: IbgeMunicipioOption) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, city: option.nome, municipalityCode: option.codigo }));
    setShowCitySuggestions(false);
  }

  function handleCityChange(value: string) {
    setIsDirty(true);
    setForm((prev) => ({ ...prev, city: value }));
    if (isAdmin) {
      setShowCitySuggestions(true);
    }
  }

  function handleCityFocus() {
    setShowCitySuggestions(true);
  }

  function handleCityBlur() {
    setTimeout(() => setShowCitySuggestions(false), 120);
  }

  if (state.status !== "authenticated" || !user) {
    return null;
  }

  function handleCloseFeedback() {
    setFeedback(null);
    if (pendingNavigate) {
      const to = pendingNavigate;
      setPendingNavigate(null);
      navigate(to);
    }
  }

  return (
    <div>
      <FeedbackModal feedback={feedback} onClose={handleCloseFeedback} />
      <section className="panel">
        <h2>{isEdit ? "Editar escola" : "Nova escola"}</h2>
        {detailQ.isLoading ? <p className="muted">Carregando…</p> : null}
        <p className="muted small">
          <Link to="/escolas">← Voltar</Link>
        </p>
        <p className="muted small">Cadastro manual de unidade escolar. A listagem e filtros ficam em Escolas.</p>

        <NewSchoolForm
          isAdmin={Boolean(isAdmin)}
          gestorMunicipalityCode={user.role === "gestor" ? user.municipalityCode : null}
          form={formState}
          onFormChange={(next) => {
            setIsDirty(true);
            setForm(next);
          }}
          onCityChange={handleCityChange}
          citySuggestions={citySearchQ.data ?? []}
          showCitySuggestions={showCitySuggestions}
          citySuggestionsLoading={citySearchQ.isFetching}
          onSelectCitySuggestion={handleSelectCitySuggestion}
          onCityFocus={handleCityFocus}
          onCityBlur={handleCityBlur}
          onMunicipalityCodeBlur={handleLookupByCode}
          lookupBusy={lookupMunicipioM.isPending}
          formError={formError}
          createM={createM}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}
