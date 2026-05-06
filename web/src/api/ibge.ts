type IbgeMunicipioResponse = {
  id?: number;
  nome?: string;
  microrregiao?: {
    mesorregiao?: {
      UF?: {
        sigla?: string;
      };
    };
  };
};

export type IbgeMunicipio = Readonly<{
  nome: string;
  uf: string | null;
}>;

export type IbgeMunicipioOption = Readonly<{
  codigo: string;
  nome: string;
  uf: string | null;
}>;

export async function fetchMunicipioByIbgeCode(code: string): Promise<IbgeMunicipio> {
  const clean = code.replaceAll(/\D/g, "").slice(0, 7);
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${clean}`);
  if (res.status === 404) {
    throw new Error("Código IBGE não encontrado.");
  }
  if (!res.ok) {
    throw new Error("Falha ao consultar IBGE.");
  }
  const data = (await res.json()) as IbgeMunicipioResponse;
  const nome = data.nome?.trim();
  if (!nome) {
    throw new Error("Resposta do IBGE sem nome de município.");
  }
  const uf = data.microrregiao?.mesorregiao?.UF?.sigla ?? null;
  return { nome, uf };
}

export async function fetchMunicipioByName(name: string): Promise<{ codigo: string; municipio: IbgeMunicipio }> {
  const q = name.trim();
  if (q.length < 3) {
    throw new Error("Informe ao menos 3 caracteres para buscar município.");
  }
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${encodeURIComponent(q)}`);
  if (!res.ok) {
    throw new Error("Falha ao consultar IBGE.");
  }
  const list = (await res.json()) as IbgeMunicipioResponse[];
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("Município não encontrado.");
  }

  const normalized = q.toLocaleLowerCase("pt-BR");
  const picked = list.find((m) => (m.nome ?? "").toLocaleLowerCase("pt-BR") === normalized) ?? list[0];
  const nome = picked.nome?.trim();
  const codigo = picked.id ? String(picked.id) : "";
  if (!nome || !codigo) {
    throw new Error("Resposta do IBGE incompleta para município.");
  }
  const uf = picked.microrregiao?.mesorregiao?.UF?.sigla ?? null;
  return { codigo, municipio: { nome, uf } };
}

export async function searchMunicipiosByName(name: string): Promise<IbgeMunicipioOption[]> {
  const q = name.trim();
  if (q.length < 3) {
    return [];
  }
  const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios?nome=${encodeURIComponent(q)}`);
  if (!res.ok) {
    throw new Error("Falha ao consultar IBGE.");
  }
  const list = (await res.json()) as IbgeMunicipioResponse[];
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }
  const norm = q.toLocaleLowerCase("pt-BR");
  const options = list
    .map((m) => {
      const nome = m.nome?.trim();
      const codigo = m.id ? String(m.id) : "";
      if (!nome || !codigo) {
        return null;
      }
      const uf = m.microrregiao?.mesorregiao?.UF?.sigla ?? null;
      return { codigo, nome, uf };
    })
    .filter((x): x is IbgeMunicipioOption => x !== null)
    .filter((m) => m.nome.toLocaleLowerCase("pt-BR").includes(norm));

  options.sort((a, b) => {
    const aName = a.nome.toLocaleLowerCase("pt-BR");
    const bName = b.nome.toLocaleLowerCase("pt-BR");
    const aStarts = aName.startsWith(norm) ? 0 : 1;
    const bStarts = bName.startsWith(norm) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aName.localeCompare(bName, "pt-BR");
  });

  return options.slice(0, 12);
}
