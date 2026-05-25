/**
 * Nome canônico de escola para leitura, busca e unicidade por município (QODE-40).
 * Ordem: trim → colapsar espaços → remover diacríticos → maiúsculas pt-BR.
 */
export function normalizeSchoolName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const withoutDiacritics = trimmed.normalize("NFD").replace(/\p{M}/gu, "");
  return withoutDiacritics.toLocaleUpperCase("pt-BR");
}
