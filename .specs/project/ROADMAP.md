# Roadmap

**Milestone atual:** M1 — Fundação e identidade  
**Status:** Concluído

---

## M1 — Fundação e identidade

**Objetivo:** Base autenticável, modelo organizacional (município → escola → turma → aluno) e contratos mínimos de API alinhados ao PRD.

**Alvo de conclusão:** Usuários dos quatro papéis existem no modelo; login e autorização por escopo; ambiente de desenvolvimento documentado.

### Features

**Autenticação e papéis (RBAC)** — COMPLETE

- Login seguro; JWT ou sessão conforme padrão do repo.
- Perfis: professor, coordenador, secretaria/município, admin; regras de escopo por turma/escola/rede.

**Modelo de dados organizacional** — COMPLETE

- Entidades: município, escola, turma, aluno, usuário vinculado ao papel e ao escopo.

**Baseline técnico** — COMPLETE

- README ou doc de arquitetura alinhada a `docs/prd/prd.md` e `.specs/features/plataforma-avaliacao/spec.md`.

---

## M2 — Banco de questões

**Objetivo:** Núcleo do sistema conforme PRD §2; admin cadastra e etiqueta; professor consulta e filtra.

### Features

**CRUD admin de questões** — PLANNED

- Objetivas A–D; campos obrigatórios de habilidade SAEB/SPA-S, disciplina, ano, dificuldade, matriz.

**Busca e filtros** — PLANNED

- Filtro por componente, ano, matriz, habilidade, dificuldade; professor sem edição de conteúdo.

**Sugestão de questões** — PLANNED

- Entrada: diagnóstico anterior + ano/disciplina + habilidades deficitárias (regra a detalhar em `tasks.md` quando implementar).

---

## M3 — Provas e cartões (PDF)

**Objetivo:** PRD §3 e §4 — três modalidades de prova e geração de PDF em lote.

### Features

**Montagem de prova personalizada** — PLANNED

- Seleção LP/MAT, 5º/9º, habilidades, quantidade por habilidade.

**Prova de recuperação** — PLANNED

- Exibir diagnóstico anterior; seleção de habilidades críticas; montagem automática.

**Simulado** — PLANNED

- Distribuição recomendada alinhada SAEB/SPA-S.

**Cartão-resposta PDF** — PLANNED

- Campos: aluno, turma, escola, código da prova, alternativas, ID para leitura automática; PDF por prova/versão.

---

## M4 — Correção por imagem (OCR)

**Objetivo:** PRD §5 — upload único ou múltiplo; pipeline OCR → aluno → marcações → gabarito → acertos/erros.

### Features

**Upload e fila de processamento** — PLANNED

- Arquivos únicos ou lote; status de processamento e erros recuperáveis.

**OCR e regras de marcação** — PLANNED

- Quatro alternativas; N/A anulada; X em branco; tolerância a qualidade de imagem.

**Validação e métricas** — PLANNED

- Teste com cartão de exemplo (entregável PRD §10); métricas de acurácia documentadas.

---

## M5 — Tabulação e relatórios

**Objetivo:** PRD §6 e §7 — agregações por nível e relatórios de diagnóstico.

### Features

**Painel aluno e turma** — PLANNED

- Por habilidade, percentual geral, ranking, mapa de calor, percentual por descritor.

**Painel escola e município** — PLANNED

- Comparativos, gaps LP/MAT, habilidades críticas da rede, painel municipal.

**Relatórios SAEB/SPA-S** — PLANNED

- Eixos LP/MAT; dominadas/não dominadas; intervenção sugerida; comparativo 5º vs 9º opcional.

**Desempenho de leitura** — PLANNED

- Cache ou pré-cálculo para consultas pesadas (PRD §9.2).

---

## Considerações futuras

- Questões discursivas (correção semi-automática ou manual).
- Integrações com LMS ou sistemas da secretaria.
- Exportações adicionais (CSV/Excel) para gestores.
