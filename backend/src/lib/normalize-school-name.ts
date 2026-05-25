/**
 * Normalização canônica do nome de escola para persistência e exibição.
 * Algoritmo determinístico: trim → colapsar espaços → remover diacríticos → maiúsculas pt-BR.
 */
export function normalizeSchoolName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleUpperCase("pt-BR");
}
