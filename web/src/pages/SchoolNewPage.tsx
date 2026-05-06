import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/useAuth";
import { fetchMunicipioByIbgeCode, searchMunicipiosByName, type IbgeMunicipioOption } from "@/api/ibge";
import { createSchool, type CreateSchoolBody } from "@/api/schools";
import { ApiError } from "@/lib/api-client";
import { FeedbackModal, type FeedbackModalState } from "@/components/ui/FeedbackModal";
import { NewSchoolForm, type NewSchoolFormState } from "./schools/NewSchoolForm";

export function SchoolNewPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { state } = useAuth();
  const [form, setForm] = useState<NewSchoolFormState>({
    name: "",
    city: "",
    municipalityCode: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackModalState | null>(null);
  const [pendingNavigate, setPendingNavigate] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);

  const user = state.status === "authenticated" ? state.user : null;
  const isAdmin = user?.role === "admin";

  const createM = useMutation({
    mutationFn: createSchool,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["schools"] });
      void qc.invalidateQueries({ queryKey: ["classes"] });
      setPendingNavigate("/escolas");
      setFeedback({ variant: "success", message: "Escola cadastrada com sucesso." });
    },
    onError: (err: unknown) => {
      setFeedback({
        variant: "error",
        message: err instanceof ApiError ? err.message : "Não foi possível cadastrar.",
      });
    },
  });

  const lookupMunicipioM = useMutation({
    mutationFn: fetchMunicipioByIbgeCode,
    onSuccess: (data) => {
      setForm((prev) => ({ ...prev, city: data.nome }));
    },
    onError: (err: unknown) => {
      setFeedback({
        variant: "error",
        message: err instanceof Error ? err.message : "Não foi possível consultar o IBGE.",
      });
    },
  });

  useEffect(() => {
    const t = setTimeout(() => {
      setCityQuery(form.city.trim());
    }, 280);
    return () => clearTimeout(t);
  }, [form.city]);

  const citySearchQ = useQuery({
    queryKey: ["ibge", "city-search", cityQuery],
    queryFn: () => searchMunicipiosByName(cityQuery),
    enabled: Boolean(isAdmin && cityQuery.length >= 3),
    staleTime: 5 * 60 * 1000,
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmed = form.name.trim();
    if (trimmed.length < 2) {
      setFeedback({ variant: "warning", message: "Informe o nome da escola (mínimo 2 caracteres)." });
      return;
    }

    const body: CreateSchoolBody = { name: trimmed };
    const city = form.city.trim();
    if (city.length >= 2) {
      body.city = city;
    }
    if (isAdmin) {
      const mc = form.municipalityCode.trim();
      if (mc.length >= 2) {
        body.municipalityCode = mc;
      }
    }

    createM.mutate(body);
  }

  function handleLookupByCode() {
    const code = form.municipalityCode.trim();
    if (code.length !== 7) {
      return;
    }
    lookupMunicipioM.mutate(code);
  }

  function handleSelectCitySuggestion(option: IbgeMunicipioOption) {
    setForm((prev) => ({ ...prev, city: option.nome, municipalityCode: option.codigo }));
    setShowCitySuggestions(false);
  }

  function handleCityChange(value: string) {
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
        <h2>Nova escola</h2>
        <p className="muted small">
          <Link to="/escolas">← Voltar</Link>
        </p>
        <p className="muted small">Cadastro manual de unidade escolar. A listagem e filtros ficam em Escolas.</p>

        <NewSchoolForm
          isAdmin={Boolean(isAdmin)}
          gestorMunicipalityCode={user.role === "gestor" ? user.municipalityCode : null}
          form={form}
          onFormChange={setForm}
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
