import type { CurriculumAxis } from "../../types/domain";

export interface SimulatedAxisBlock {
  axis: CurriculumAxis;
  count: number;
}

type Key = `${"SAEB" | "SPAS"}:${"LP" | "MAT"}:${"5" | "9"}`;

/** Distribuição sugerida de questões por eixo para simulados (ajustável pelo admin no produto). */
const BLUEPRINTS: Record<Key, SimulatedAxisBlock[]> = {
  "SAEB:LP:5": [
    { axis: "LEITURA", count: 4 },
    { axis: "INTERPRETACAO", count: 5 },
    { axis: "GENEROS_TEXTUAIS", count: 3 },
    { axis: "LINGUA_ESTUDO", count: 2 },
  ],
  "SAEB:LP:9": [
    { axis: "LEITURA", count: 3 },
    { axis: "INTERPRETACAO", count: 6 },
    { axis: "GENEROS_TEXTUAIS", count: 4 },
    { axis: "LINGUA_ESTUDO", count: 3 },
  ],
  "SAEB:MAT:5": [
    { axis: "NUMEROS", count: 5 },
    { axis: "ALGEBRA", count: 3 },
    { axis: "GEOMETRIA", count: 4 },
    { axis: "ESTATISTICA", count: 2 },
    { axis: "GRANDEZAS_MEDIDAS", count: 2 },
  ],
  "SAEB:MAT:9": [
    { axis: "NUMEROS", count: 4 },
    { axis: "ALGEBRA", count: 5 },
    { axis: "GEOMETRIA", count: 4 },
    { axis: "ESTATISTICA", count: 3 },
    { axis: "GRANDEZAS_MEDIDAS", count: 2 },
  ],
  "SPAS:LP:5": [
    { axis: "LEITURA", count: 5 },
    { axis: "INTERPRETACAO", count: 5 },
    { axis: "GENEROS_TEXTUAIS", count: 3 },
    { axis: "LINGUA_ESTUDO", count: 1 },
  ],
  "SPAS:LP:9": [
    { axis: "LEITURA", count: 4 },
    { axis: "INTERPRETACAO", count: 6 },
    { axis: "GENEROS_TEXTUAIS", count: 3 },
    { axis: "LINGUA_ESTUDO", count: 3 },
  ],
  "SPAS:MAT:5": [
    { axis: "NUMEROS", count: 6 },
    { axis: "ALGEBRA", count: 3 },
    { axis: "GEOMETRIA", count: 4 },
    { axis: "ESTATISTICA", count: 2 },
  ],
  "SPAS:MAT:9": [
    { axis: "NUMEROS", count: 5 },
    { axis: "ALGEBRA", count: 4 },
    { axis: "GEOMETRIA", count: 4 },
    { axis: "ESTATISTICA", count: 3 },
    { axis: "GRANDEZAS_MEDIDAS", count: 2 },
  ],
};

export function getSimulatedBlueprint(
  framework: "SAEB" | "SPAS",
  discipline: "LP" | "MAT",
  grade: "5" | "9",
): SimulatedAxisBlock[] {
  const key = `${framework}:${discipline}:${grade}` as Key;
  return BLUEPRINTS[key] ?? [];
}
