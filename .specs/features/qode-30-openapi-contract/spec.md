# Especificação — QODE-30: Ampliar testes de contrato OpenAPI no backend

**Jira:** [QODE-30](https://scorefy.atlassian.net/browse/QODE-30)  
**Tipo:** Melhoria técnica  
**Branch:** `feature/QODE-30-openapi-contract-tests`

## Problem Statement

O backend expõe contrato OpenAPI em `openapi.ts` e valida alinhamento com schemas Zod apenas para **escolas**, **turmas** e **alunos** (`tests/contract/*-openapi.contract.test.ts`). Os módulos **auth**, **questions**, **exams** e **results** já estão documentados no OpenAPI e são usados pelo front, mas **não têm testes de contrato** que impeçam drift entre spec e validação real.

Sem esses testes, mudanças em Zod ou no documento OpenAPI podem passar no CI (`npm test`) sem quebrar a documentação pública (`/openapi.json`, Swagger UI).

## Goals

- [ ] Cobrir com testes de contrato os endpoints **críticos** de auth, questions, exams e results, no mesmo padrão dos módulos já cobertos.
- [ ] Garantir que `npm test` no backend (já executado no CI) inclua os novos arquivos em `tests/contract/`.
- [ ] Reduzir duplicação entre arquivos de contrato via helpers compartilhados.

## Out of Scope

| Item | Motivo |
|------|--------|
| Completar OpenAPI para rotas ainda não documentadas (ex.: `PATCH /api/exams/{id}`, `GET /api/exams/{id}/answer-sheets`, uploads de scan) | Melhoria de documentação separada; só entra nesta task se um teste de contrato **prioritário** exigir ajuste mínimo no spec. |
| Testes de integração HTTP (supertest) ou validação de corpo de resposta JSON | Escopo é **contrato estático** OpenAPI ↔ Zod, não comportamento runtime. |
| Geração automática de OpenAPI a partir de Zod | Padrão atual é documento manual em `openapi.ts`. |
| Front-end / tipos TypeScript gerados a partir do OpenAPI | Fora do backend. |

---

## Estado atual (baseline)

### Já coberto

| Arquivo | Módulo |
|---------|--------|
| `schools-openapi.contract.test.ts` | Escolas |
| `classes-openapi.contract.test.ts` | Turmas |
| `students-openapi.contract.test.ts` | Alunos |
| `delete-routes-openapi.contract.test.ts` | DELETE padronizado (inclui questions/exams) |

### Padrão de teste existente (referência)

Para cada recurso principal:

1. Operações expostas com `security: [{ bearerAuth: [] }]` quando a rota exige auth (exceto login/bootstrap).
2. `*Request` **required** e **properties** alinhados ao schema Zod de criação (campos obrigatórios = não opcionais no Zod).
3. Parâmetros de query do `GET` listagem = chaves de `list*Schema`.
4. `POST` 201 referencia `#/components/schemas/IdResponse` quando a API devolve `{ id }`.

Helpers locais duplicados: `sortFieldNames`, `read*RequestRequired`, `read*RequestPropertyKeys`.

### Lacunas conhecidas OpenAPI ↔ runtime (informativo)

Rotas implementadas **sem** entrada em `openapi.ts` (não bloqueiam contrato dos paths já documentados):

- `PATCH /api/exams/{id}`
- `GET /api/exams/{id}/answer-sheets`
- `POST/PATCH` fluxos de scan em `/api/results/answer-sheets/{id}/scans` (e correlatos)

Documentar ou testar essas rotas fica **fora do escopo** salvo decisão explícita na fase Execute.

---

## User Stories

### P1: Contrato Auth ⭐ MVP

**História:** Como desenvolvedor, quero testes que garantam que login, bootstrap, perfil e atribuição de turmas no OpenAPI refletem os schemas Zod de auth.

**Por que P1:** Sem auth documentada de forma confiável, o front e integrações quebram na entrada do sistema.

**Critérios de aceite:**

1. WHEN o arquivo `auth-openapi.contract.test.ts` roda THEN o sistema SHALL validar `LoginRequest` e `BootstrapAdminRequest` (required + properties) contra `loginSchema` e `bootstrapAdminSchema`.
2. WHEN inspecionado `POST /api/auth/login` e `POST /api/auth/bootstrap-admin` THEN o OpenAPI SHALL **não** exigir `bearerAuth` (rotas públicas).
3. WHEN inspecionado `GET /api/auth/me` e `PATCH /api/auth/users/{userId}/classrooms` THEN o OpenAPI SHALL exigir `bearerAuth`.
4. WHEN `PATCH .../classrooms` é testado THEN `PatchProfessorClassroomsRequest` SHALL alinhar com o schema Zod correspondente (`classroomIds` obrigatório).

**Teste independente:** `npm run test:contract -- auth-openapi`.

**Rastreio:** REQ-OAPI-01 … REQ-OAPI-04

---

### P1: Contrato Questions ⭐ MVP

**História:** Como desenvolvedor, quero que listagem, criação e endpoints auxiliares do banco de questões no OpenAPI coincidam com os schemas Zod.

**Critérios de aceite:**

1. WHEN testado `GET/POST /api/questions` THEN operações SHALL existir com `bearerAuth` e `POST` 201 SHALL referenciar `IdResponse`.
2. WHEN testado `QuestionRequest` THEN required/properties SHALL alinhar com `createQuestionSchema` (tratando `framework` com default no Zod como opcional no required do OpenAPI, seguindo regra: required OpenAPI = campos não opcionais no Zod).
3. WHEN testado `GET /api/questions` THEN parâmetros de query SHALL igualar chaves de `listQuestionsSchema`.
4. WHEN testados `GET /api/questions/descriptors` e `GET /api/questions/suggestions` THEN parâmetros SHALL alinhar com `listDescriptorsSchema` e `questionSuggestionsSchema` (incluindo required na query conforme Zod).

**Teste independente:** `npm run test:contract -- questions-openapi`.

**Rastreio:** REQ-OAPI-05 … REQ-OAPI-08

---

### P1: Contrato Exams ⭐ MVP

**História:** Como desenvolvedor, quero contrato testável para criação, listagem e fluxos principais de prova documentados no OpenAPI.

**Critérios de aceite:**

1. WHEN testado `GET/POST /api/exams` THEN SHALL seguir padrão bearer + alinhamento `listExamsSchema` / `createExamSchema` com `ExamRequest`.
2. WHEN testado `GET /api/exams/blueprint/simulado` THEN parâmetros SHALL alinhar com `simulatedBlueprintQuerySchema` (`discipline`, `grade` obrigatórios).
3. WHEN testado `GET /api/exams/{id}` THEN SHALL declarar parâmetro `id` no path e `bearerAuth`.
4. WHEN testados `GET/POST /api/exams/{id}/answer-key` e `POST /api/exams/{id}/answer-sheets/generate` THEN SHALL exigir `bearerAuth` e request bodies (quando houver) SHALL referenciar schemas declarados em `components` (`AnswerKeyRequest`, `GenerateSheetsRequest`) alinhados aos Zod `createOfficialAnswerKeySchema` e schema de geração de cartões.

**Teste independente:** `npm run test:contract -- exams-openapi`.

**Rastreio:** REQ-OAPI-09 … REQ-OAPI-12

---

### P1: Contrato Results ⭐ MVP

**História:** Como desenvolvedor, quero que endpoints de correção e diagnóstico documentados no OpenAPI reflitam os schemas Zod de results.

**Critérios de aceite:**

1. WHEN testado `POST /api/results/answer-sheets` THEN `RegisterAnswerSheetRequest` SHALL alinhar com `registerAnswerSheetSchema`.
2. WHEN testado `POST /api/results/corrections/by-order` THEN body SHALL alinhar com schema Zod usado na rota (`submitMarksByOrderSchema` / nome equivalente no OpenAPI `CorrectionByOrderRequest`).
3. WHEN testados endpoints `GET` de diagnóstico e relatórios documentados (`/api/results/diagnosis/classroom`, `by-axis`, `student/.../summary`, `classroom/.../ranking`, `heatmap`, `school/.../summary`, `municipality/summary`, `reports/classroom/...`) THEN cada um SHALL ter `bearerAuth` e parâmetros de query/path alinhados ao schema Zod correspondente em `results.schemas.ts`.
4. WHEN qualquer divergência for detectada entre nome de schema OpenAPI e Zod THEN a implementação SHALL **corrigir OpenAPI ou Zod** para manter uma única fonte de verdade acordada (preferência: ajustar OpenAPI se estiver incompleto; ajustar Zod só se spec estiver correta e código desatualizado).

**Teste independente:** `npm run test:contract -- results-openapi`.

**Rastreio:** REQ-OAPI-13 … REQ-OAPI-16

---

### P2: Helpers compartilhados de contrato

**História:** Como mantenedor, quero utilitários únicos para leitura de schemas OpenAPI e comparação com Zod, para evitar cópia de `sortFieldNames` e leitores em cada arquivo.

**Critérios de aceite:**

1. WHEN novos testes forem adicionados THEN SHALL usar módulo compartilhado (ex.: `tests/contract/openapi-contract-helpers.ts`).
2. WHEN refatorados testes existentes de schools/classes/students THEN comportamento SHALL permanecer idêntico (sem mudança de asserções).

**Rastreio:** REQ-OAPI-17

---

## Regras de alinhamento Zod ↔ OpenAPI

| Regra | Detalhe |
|-------|---------|
| **Required** | Campo listado em `required` do OpenAPI ↔ campo **não** `.optional()` no Zod (defaults `.default()` contam como opcional para required). |
| **Properties** | Conjunto de chaves em `properties` = chaves em `.shape` do objeto Zod (ordem ignorada; comparar sorted). |
| **Query params** | Nomes em `parameters` do GET = chaves do `list*Schema` / query schema da rota. |
| **Path params** | `id`, `userId`, `studentId`, `classroomId`, `schoolId` conforme rota. |
| **Security** | Rotas com `requireAuth` no Express → `security: [{ bearerAuth: [] }]` no OpenAPI. Rotas públicas (login, bootstrap) → sem security. |
| **201 + id** | Criações que retornam `{ id }` → `$ref: '#/components/schemas/IdResponse'`. |

---

## Matriz de rastreabilidade

| ID | História | Artefato de teste |
|----|----------|-------------------|
| REQ-OAPI-01 | Auth login/bootstrap schemas | `auth-openapi.contract.test.ts` |
| REQ-OAPI-02 | Auth rotas públicas vs bearer | idem |
| REQ-OAPI-03 | GET /me security | idem |
| REQ-OAPI-04 | PATCH professor classrooms | idem |
| REQ-OAPI-05 | Questions GET/POST + IdResponse | `questions-openapi.contract.test.ts` |
| REQ-OAPI-06 | QuestionRequest ↔ Zod | idem |
| REQ-OAPI-07 | listQuestions query | idem |
| REQ-OAPI-08 | descriptors + suggestions query | idem |
| REQ-OAPI-09 | Exams list/create | `exams-openapi.contract.test.ts` |
| REQ-OAPI-10 | blueprint/simulado query | idem |
| REQ-OAPI-11 | exam by id | idem |
| REQ-OAPI-12 | answer-key + generate sheets | idem |
| REQ-OAPI-13 | register answer sheet | `results-openapi.contract.test.ts` |
| REQ-OAPI-14 | corrections by order | idem |
| REQ-OAPI-15 | diagnosis/report GET params | idem |
| REQ-OAPI-16 | drift resolution policy | idem (comentário + fixes no PR) |
| REQ-OAPI-17 | shared helpers | `openapi-contract-helpers.ts` + refactor |

---

## Critérios de sucesso (aceite da task Jira)

- [ ] Quatro novos arquivos de contrato (auth, questions, exams, results) passando localmente com `npm run test:contract`.
- [ ] `npm test` no CI continua verde (job `backend-tests` já roda suite completa).
- [ ] Nenhuma regressão nos quatro arquivos de contrato existentes após refactor P2 (se feito no mesmo PR).
- [ ] Divergências encontradas entre OpenAPI e Zod corrigidas ou documentadas no PR com justificativa.

---

## Referências

- Documento OpenAPI: `backend/src/docs/openapi.ts`
- Script: `npm run test:contract` → `jest tests/contract`
- Contratos existentes: `backend/tests/contract/`
- Schemas Zod: `backend/src/modules/{auth,questions,exams,results}/*.schemas.ts`
