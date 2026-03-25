/** Textos genéricos de intervenção; podem ser substituídos por base curricular no futuro. */
export function suggestIntervention(descriptor: string, axis?: string | null): string {
  if (axis === "NUMEROS" || axis === "ALGEBRA") {
    return `Reforçar sentido do número e resolução de problemas contextualizados relacionados a ${descriptor}.`;
  }
  if (axis === "GEOMETRIA" || axis === "GRANDEZAS_MEDIDAS") {
    return `Trabalhar visualização espacial e estimativa com materiais concretos para ${descriptor}.`;
  }
  if (axis === "ESTATISTICA") {
    return `Explorar leitura de dados e gráficos com situações do cotidiano (${descriptor}).`;
  }
  if (axis === "LEITURA" || axis === "INTERPRETACAO") {
    return `Propor leitura guiada e inferência de sentido com textos adequados ao ano (${descriptor}).`;
  }
  if (axis === "GENEROS_TEXTUAIS") {
    return `Variar gêneros e praticar identificação de finalidade e estrutura (${descriptor}).`;
  }
  return `Planejar revisão sistemática do descritor ${descriptor} com base na matriz SAEB/SPA-S.`;
}
