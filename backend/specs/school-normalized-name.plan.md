# Plano — QODE-40 Escola (`name` + `normalizedName`)

**Spec:** [`school-normalized-name.spec.md`](./school-normalized-name.spec.md)  
**Issue:** QODE-40  
**Status:** Implementado (código + testes; migração manual T9–T10 em deploy)  
**Escopo:** Backend → migração → contrato/testes → frontend → QA manual

---

## Resumo executivo

| Fase | Entrega | Bloqueia |
| --- | --- | --- |
| 1 | Helper + testes unitários | Tudo no backend |
| 2 | Modelo + rotas + schemas | GET/POST/PATCH com `normalizedName` |
| 3 | OpenAPI + testes backend | Contrato e CI backend |
| 4 | Migração de dados | Deploy em ambientes com dados |
| 5 | Frontend leitura/escrita + testes | Critérios de aceite visíveis |
| 6 | QA manual | Fechamento da issue |

**Ordem crítica:** concluir Fases 1–3 antes de rodar migração em produção; Fase 5 pode começar após T8 (GET estável em dev).

**Estimativa total:** ~1,5–2 dias de dev (1 dev), assumindo poucas colisões na migração.

---

## Plano de execução

### Visão geral

```
Fase 1:  T1 → T2
Fase 2:  T3 → T4 → T5
Fase 3:  T6 → T7 → T8
Fase 4:  T9 → T10 (T10 só se T9 sem colisões)
Fase 5:  T11 → T12 → T13 → T14
Fase 6:  T15
```

### Mapa de paralelismo

| Fase | Paralelo? | Notas |
| --- | --- | --- |
| 1 | Não | TDD do helper primeiro |
| 2 | Não | Modelo antes das rotas |
| 3 | Parcial | T7 [P] pode rodar junto com T6 após T5 |
| 4 | Não | Migração exige backend da Fase 2 |
| 5 | Parcial | T12 [P] por arquivo de página após T11 |
| 6 | Não | Checklist manual da spec §10 |

---

## Fase 1 — Fundação (helper)

### T1: Função `normalizeSchoolName`

**O quê:** Implementar função pura conforme spec §2.2 (trim → colapsar espaços → NFD sem diacríticos → `toLocaleUpperCase("pt-BR")`).

**Onde:** `backend/src/lib/normalize-school-name.ts`

**Depende de:** —

**Requisitos:** B2

**Feito quando:**

- [ ] Arquivo exporta `normalizeSchoolName(name: string): string`
- [ ] Casos da spec: `Teste João` → `TESTE JOAO`; `EMEF   José de Alencar` → `EMEF JOSE DE ALENCAR`
- [ ] `npm run check` sem erros no backend

**Commit sugerido:** `feat(schools): add normalizeSchoolName helper`

---

### T2: Testes unitários do helper

**O quê:** Cobrir tabela de exemplos e bordas (string vazia após trim, múltiplos espaços, acentos).

**Onde:** `backend/tests/unit/normalize-school-name.test.ts`

**Depende de:** T1

**Requisitos:** M7

**Feito quando:**

- [ ] Testes verdes: `npm test -- normalize-school-name`
- [ ] Pelo menos os 2 exemplos obrigatórios da spec assertados

**Commit sugerido:** `test(schools): unit tests for normalizeSchoolName`

---

## Fase 2 — Modelo e API (escrita/leitura)

### T3: Modelo Mongoose `School`

**O quê:** Adicionar `normalizedName` obrigatório; substituir índice `{ municipalityCode, name }` por índice único `{ municipalityCode, normalizedName }` (quando `municipalityCode` presente — usar índice parcial/sparse conforme padrão do projeto).

**Onde:** `backend/src/modules/schools/school.model.ts`

**Depende de:** T1

**Requisitos:** B1, índice spec §5.1

**Feito quando:**

- [ ] `normalizedName: { type: String, required: true }`
- [ ] Índice único `municipalityCode + normalizedName` definido no schema
- [ ] Índice legado `municipalityCode + name` removido do schema (migração T10 remove do DB)

**Commit sugerido:** `feat(schools): add normalizedName to School model`

---

### T4: Schemas Zod (entrada)

**O quê:** Garantir `.strict()` em create/update; rejeitar `normalizedName` no body com 400.

**Onde:** `backend/src/modules/schools/schools.schemas.ts`

**Depende de:** —

**Requisitos:** B6, M8

**Feito quando:**

- [ ] `createSchoolSchema` / `updateSchoolSchema` com `.strict()`
- [ ] Teste em `schools.schemas.test.ts`: payload com `normalizedName` falha

**Commit sugerido:** `feat(schools): reject normalizedName in request body`

---

### T5: Rotas CREATE/PATCH/GET + 409 + busca

**O quê:**

- POST: derivar `normalizedName` de `name` antes de `create`
- PATCH: recalcular só se `name` no body; caso contrário manter
- GET list/detail: resposta inclui `normalizedName` (lean, sem strip)
- `nameContains`: normalizar query e filtrar por `normalizedName` (regex escapado)
- Sort listagem: `normalizedName` asc
- Duplicata `{ municipalityCode, normalizedName }` → **409** (capturar `MongoServerError` code 11000)

**Onde:** `backend/src/modules/schools/schools.routes.ts`

**Depende de:** T1, T3, T4

**Requisitos:** B3, B4, B5, B7, B8, B10, B11, 409 spec §6.3

**Feito quando:**

- [ ] POST com `name: "Teste João"` persiste `normalizedName: "TESTE JOAO"`
- [ ] PATCH só `city` não altera `normalizedName`
- [ ] PATCH `name` atualiza `normalizedName`
- [ ] Segundo POST igual no mesmo IBGE → 409

**Commit sugerido:** `feat(schools): derive normalizedName on write and expose on GET`

---

## Fase 3 — Contrato e testes backend

### T6: OpenAPI `School`

**O quê:** `School.required` inclui `normalizedName`; propriedade documentada; `SchoolRequest` sem `normalizedName`.

**Onde:** `backend/src/docs/openapi.ts`

**Depende de:** T5

**Requisitos:** B9, M5

**Feito quando:**

- [ ] Schema `School` com `name` + `normalizedName` em `required`

**Commit sugerido:** `docs(openapi): document School.normalizedName`

---

### T7: Testes de integração [P]

**O quê:** Cenários CREATE, GET, PATCH name, PATCH city, 409 duplicata, gestor/IBGE existentes.

**Onde:** `backend/tests/integration/schools.integration.test.ts`

**Depende de:** T5

**Requisitos:** M6

**Feito quando:**

- [ ] `npm test -- schools.integration` verde
- [ ] GET asserta presença de `normalizedName` em list e by id

**Commit sugerido:** `test(schools): integration coverage for normalizedName`

---

### T8: Teste de contrato OpenAPI

**O quê:** Alinhar `schools-openapi.contract.test.ts` ao schema com `normalizedName`.

**Onde:** `backend/tests/contract/schools-openapi.contract.test.ts`

**Depende de:** T6

**Requisitos:** M5

**Feito quando:**

- [ ] `npm run test:contract` (ou filtro schools) verde

**Commit sugerido:** `test(contract): schools schema includes normalizedName`

**Gate Fase 3:** `cd backend && npm test` verde.

---

## Fase 4 — Migração de dados

### T9: Script de migração + relatório de colisões

**O quê:**

- Backfill `normalizedName` para todos os documentos
- Agrupar por `(municipalityCode, normalizedName)` e listar `count > 1`
- Exit code ≠ 0 se houver colisões
- Flag `--apply-index` para criar índice único e dropar índice legado **somente** sem colisões

**Onde:** `backend/src/scripts/migrate-school-normalized-name.ts`

**Depende de:** T1, T3

**Requisitos:** M1, M2, M3

**Feito quando:**

- [ ] Script roda em dev/staging com `DATABASE_URL`
- [ ] Relatório de colisões legível (console ou JSON)
- [ ] Documentação de uso no cabeçalho do script (como rollback)

**Commit sugerido:** `chore(schools): migration script for normalizedName backfill`

---

### T10: Aplicar índice em ambiente limpo

**O quê:** Após resolver colisões manualmente (se houver), executar migração com `--apply-index`.

**Depende de:** T9 (zero colisões)

**Requisitos:** M3

**Feito quando:**

- [ ] Índice `municipalityCode_1_normalizedName_1` existe
- [ ] Índice `municipalityCode_1_name_1` removido
- [ ] `rollback-school-normalized-name.ts` testado em dev (opcional dry-run)

**Nota:** T10 é operação de deploy/ops — pode ser commit só de doc ou execução manual registrada no ticket Jira.

---

## Fase 5 — Frontend

### T11: Schema e API client

**O quê:**

- `web/src/schemas/school.ts`: `normalizedName: z.string()` obrigatório no tipo de resposta
- Mocks em `web/src/api/schools.test.ts` com ambos os campos
- Helper opcional `schoolDisplayName(school)` → `normalizedName` (evita regressão)

**Onde:** `web/src/schemas/school.ts`, `web/src/api/schools.test.ts`

**Depende de:** T8 (API estável)

**Requisitos:** F1

**Feito quando:**

- [ ] Parse Zod de resposta GET não falha com payload completo
- [ ] Testes de API client verdes

**Commit sugerido:** `feat(web): School schema with normalizedName`

---

### T12: Telas de leitura — usar `normalizedName` [P]

**O quê:** Substituir exibição `school.name` / `s.name` por `normalizedName` em telas alimentadas por GET. **Manter `name` apenas** em inputs de formulário (T13).

**Arquivos (grep confirmado):**

| Arquivo | Uso atual | Ação |
| --- | --- | --- |
| `web/src/pages/SchoolsPage.tsx` | tabela, aria-labels, diálogo excluir | `normalizedName` |
| `web/src/pages/SchoolSummaryPage.tsx` | títulos, selects, `schoolName` | `normalizedName` |
| `web/src/pages/DashboardHomePage.tsx` | `<strong>{s.name}` | `normalizedName` |
| `web/src/pages/MunicipalityPage.tsx` | lista escolas | `normalizedName` |
| `web/src/pages/ClassesPage.tsx` | `schoolNameById` map | `normalizedName` |
| `web/src/pages/ClassroomPage.tsx` | `schoolName` | `normalizedName` |
| `web/src/pages/ExamNewPage.tsx` | options label | `normalizedName` |
| `web/src/pages/classes/ClassesListFilters.tsx` | options | `normalizedName` |
| `web/src/pages/classes/NewClassroomForm.tsx` | options | `normalizedName` |
| `web/src/pages/students/StudentsListFilters.tsx` | options | `normalizedName` |

**Não alterar:** `SchoolNewPage.tsx` / `NewSchoolForm.tsx` — input continua `name`; pré-preenchimento edição com `detailQ.data?.name`.

**Depende de:** T11

**Requisitos:** F2, F3

**Feito quando:**

- [ ] `rg 's\.name|school\?\.name|schoolName.*\.name' web/src/pages` sem hits de **exibição** de escola (turma/aluno `c.name` permanece)
- [ ] Build/typecheck web ok

**Commit sugerido:** `feat(web): display school normalizedName on read screens`

---

### T13: Formulário e edição (escrita)

**O quê:**

- POST/PATCH enviam só `name` (sem mudança)
- Edição: GET `/:id` pré-preenche input com `name`
- Tratar **409** na criação/edição (toast ou mensagem inline)

**Onde:** `SchoolNewPage.tsx`, fluxo de save em `schools` API

**Depende de:** T11

**Requisitos:** F5, F6, F7, F8

**Feito quando:**

- [ ] Fluxo criar → listagem mostra `normalizedName`
- [ ] Fluxo editar → input com `name`, lista com `normalizedName`
- [ ] Duplicata exibe erro amigável

**Commit sugerido:** `feat(web): handle school duplicate 409 on save`

---

### T14: Testes de componente/página

**O quê:** Assert que listagem renderiza texto de `normalizedName` quando mock GET traz ambos.

**Onde:**

- `web/src/pages/SchoolsPage.test.tsx`
- `web/src/pages/SchoolSummaryPage.test.tsx`
- `web/src/schemas/school.test.ts`

**Depende de:** T12

**Requisitos:** F4

**Feito quando:**

- [ ] `npm test` no workspace `web` verde nos testes tocados

**Commit sugerido:** `test(web): schools list shows normalizedName`

**Gate Fase 5:** `cd web && npm test` + smoke manual rápido (cenários 1–2 da spec §10).

---

## Fase 6 — QA e fechamento

### T15: QA manual + critérios de aceite

**O quê:** Executar tabela spec §10 (6 cenários) e marcar critérios §9 no Jira.

**Depende de:** T10 (ambiente com migração), T14

**Feito quando:**

- [ ] Cenários 1–6 OK
- [ ] CI verde (backend + web)
- [ ] QODE-40 pronta para merge

---

## Rastreabilidade spec → tarefas

| Requisito | Tarefa(s) |
| --- | --- |
| B1–B2 | T1, T3 |
| B3–B5, B7–B11 | T5 |
| B6, M8 | T4 |
| B9, M5 | T6, T8 |
| M6 | T7 |
| M1–M3 | T9, T10 |
| M4 | `rollback-school-normalized-name.ts` (validar em T10) |
| M7 | T2 |
| F1 | T11 |
| F2–F3 | T12 |
| F4 | T14 |
| F5–F8 | T13 |
| Aceite §9 | T15 |
| QA §10 | T15 |

---

## Comandos de verificação

```bash
# Backend — após Fase 3
cd backend && npm run check && npm test

# Contrato
cd backend && npm run test:contract

# Migração (dev)
cd backend && DATABASE_URL=... npx ts-node --transpile-only src/scripts/migrate-school-normalized-name.ts
cd backend && DATABASE_URL=... npx ts-node --transpile-only src/scripts/migrate-school-normalized-name.ts --apply-index

# Web — após Fase 5
cd web && npm test

# Busca regressão exibição
rg '\.name' web/src/pages --glob '*School*'
rg 'schoolName|schools\.map' web/src/pages
```

---

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Colisões pós-backfill (nomes diferentes → mesmo `normalizedName`) | T9 relatório; correção manual de `name` ou merge offline antes de T10 |
| Deploy código novo antes da migração | GET exige campo: rodar T9 antes ou no mesmo deploy; documentar ordem deploy |
| Escolas sem `municipalityCode` | Índice único só quando IBGE presente; definir regra 409 só com município |
| Regressão em `schoolName` derivado em runtime | T12 revisa todos os maps `schoolNameById` |

---

## Fora deste plano

- QODE-41 (Alunos), QODE-42 (Turma)
- `schoolSnapshot` em cartões já emitidos
- Commits e PR — executar conforme pedido do usuário

---

## Ordem sugerida de PRs (opcional)

1. **PR1 — Backend core:** T1–T8 (helper, modelo, rotas, OpenAPI, testes)
2. **PR2 — Migração:** T9–T10 (scripts + runbook no ticket)
3. **PR3 — Frontend:** T11–T14
4. **PR4 — QA:** evidência T15 (pode ser só comentário no Jira)

Alternativa **PR único** se o time preferir entrega atômica da QODE-40.
