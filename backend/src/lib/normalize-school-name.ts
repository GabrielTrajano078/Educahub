/**
 * Nome canônico de escola para leitura, busca e unicidade por município (QODE-40).
 * Ordem: trim → colapsar espaços → reconstruir letras espaçadas → NFD → maiúsculas pt-BR.
 */

/** Preposições para separar blocos colados (ex.: josedealencar → jose + de + alencar). */
const MERGE_SPLIT_PARTICLES = ["dos", "das", "de", "da", "do"] as const;

function splitMergedLettersByParticles(merged: string): string[] {
  const lower = merged.toLocaleLowerCase("pt-BR");
  const words: string[] = [];
  let rest = lower;

  while (rest.length > 0) {
    let bestIdx = rest.length;
    let bestParticle = "";

    for (const particle of MERGE_SPLIT_PARTICLES) {
      const idx = rest.indexOf(particle);
      if (idx > 0 && idx < bestIdx) {
        bestIdx = idx;
        bestParticle = particle;
      }
    }

    if (bestParticle) {
      words.push(rest.slice(0, bestIdx));
      words.push(bestParticle);
      rest = rest.slice(bestIdx + bestParticle.length);
      continue;
    }

    words.push(rest);
    break;
  }

  return words.filter((w) => w.length > 0);
}

/** Junta tokens de 1 caractere e separa preposições comuns (de, da, do…). */
function reconstructLetterSpacedWords(collapsed: string): string {
  const tokens = collapsed.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return "";
  }

  const singleCharCount = tokens.filter((t) => t.length === 1).length;
  const singleCharRatio = singleCharCount / tokens.length;
  if (tokens.length < 4 || singleCharRatio <= 0.5) {
    return collapsed;
  }

  const words: string[] = [];
  let letterBuffer = "";

  const flushLetterBuffer = () => {
    if (!letterBuffer) {
      return;
    }
    words.push(...splitMergedLettersByParticles(letterBuffer));
    letterBuffer = "";
  };

  for (const token of tokens) {
    if (token.length === 1) {
      letterBuffer += token;
      continue;
    }

    flushLetterBuffer();
    words.push(token);
  }

  flushLetterBuffer();
  return words.join(" ");
}

export function normalizeSchoolName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const reconstructed = reconstructLetterSpacedWords(trimmed);
  const withoutDiacritics = reconstructed.normalize("NFD").replace(/\p{M}/gu, "");
  return withoutDiacritics.toLocaleUpperCase("pt-BR");
}
