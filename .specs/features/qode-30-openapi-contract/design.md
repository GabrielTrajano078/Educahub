# Design — QODE-30: Testes de contrato OpenAPI

## Abordagem

Testes **estáticos** que importam `openApiDocument` e schemas Zod, sem subir servidor nem MongoDB. Mesma filosofia de `schools-openapi.contract.test.ts`: falha rápida quando documentação e validação divergem.

## Estrutura de arquivos (alvo)

```
backend/tests/contract/
├── openapi-contract-helpers.ts      # P2 — novo
├── schools-openapi.contract.test.ts # existente (refatorar opcional)
├── classes-openapi.contract.test.ts
├── students-openapi.contract.test.ts
├── delete-routes-openapi.contract.test.ts
├── auth-openapi.contract.test.ts      # P1 — novo
├── questions-openapi.contract.test.ts
├── exams-openapi.contract.test.ts
└── results-openapi.contract.test.ts
```

## Helpers compartilhados (`openapi-contract-helpers.ts`)

```ts
// Funções exportadas (assinaturas alvo)
sortFieldNames(names: string[]): string[]
readSchemaRequired(componentName: string): string[]
readSchemaPropertyKeys(componentName: string): string[]
readOperationQueryParamNames(path: string, method: "get" | "post"): string[]
readOperationSecurity(path: string, method: string): unknown
zodRequiredKeys(shape: ZodObject): string[]
zodShapeKeys(shape: ZodObject): string[]
```

Implementação: leitura defensiva de `openApiDocument.components.schemas` e `paths[path][method]`, espelhando código já duplicado nos testes de escolas/turmas/alunos.

## Mapa endpoint → schema Zod

### Auth

| Path | Método | Schema Zod / notas |
|------|--------|-------------------|
| `/api/auth/login` | POST | `loginSchema` → `LoginRequest` |
| `/api/auth/bootstrap-admin` | POST | `bootstrapAdminSchema` → `BootstrapAdminRequest` |
| `/api/auth/me` | GET | sem body; só security |
| `/api/auth/users/{userId}/classrooms` | PATCH | schema de patch em `auth` ou `users` (validar no código: `patchProfessorClassroomsSchema` ou equivalente) |

### Questions

| Path | Método | Schema Zod |
|------|--------|------------|
| `/api/questions` | GET | `listQuestionsSchema` |
| `/api/questions` | POST | `createQuestionSchema` → `QuestionRequest` |
| `/api/questions/descriptors` | GET | `listDescriptorsSchema` |
| `/api/questions/suggestions` | GET | `questionSuggestionsSchema` |

### Exams

| Path | Método | Schema Zod |
|------|--------|------------|
| `/api/exams` | GET | `listExamsSchema` |
| `/api/exams` | POST | `createExamSchema` → `ExamRequest` |
| `/api/exams/blueprint/simulado` | GET | `simulatedBlueprintQuerySchema` |
| `/api/exams/{id}` | GET | `examIdParamSchema` (path) |
| `/api/exams/{id}/answer-key` | GET/POST | path + `createOfficialAnswerKeySchema` no POST |
| `/api/exams/{id}/answer-sheets/generate` | POST | `generateAnswerSheetsSchema` (confirmar nome em `exams.schemas.ts`) |

**Nota:** `createExamSchema` usa `.refine()` — testes de contrato cobrem apenas **shape** de propriedades/required do objeto base, não a regra refine (validada em testes unitários de schema).

### Results

| Path | Método | Schema Zod |
|------|--------|------------|
| `/api/results/answer-sheets` | POST | `registerAnswerSheetSchema` |
| `/api/results/corrections/by-order` | POST | `submitMarksByOrderSchema` |
| `/api/results/diagnosis/classroom` | GET | `diagnosisByClassroomSchema` |
| `/api/results/diagnosis/classroom/by-axis` | GET | mesmo ou schema dedicado (verificar rota) |
| `/api/results/student/{studentId}/summary` | GET | `studentSummarySchema` |
| `/api/results/classroom/{classroomId}/ranking` | GET | `classroomRankingSchema` |
| `/api/results/classroom/{classroomId}/heatmap` | GET | `classroomHeatmapSchema` |
| `/api/results/school/{schoolId}/summary` | GET | `schoolSummarySchema` |
| `/api/results/municipality/summary` | GET | `municipalitySummarySchema` |
| `/api/results/reports/classroom/{classroomId}` | GET | `classroomReportSchema` |

Para GET com parâmetros em **path** e **query**, o teste deve unir:

- path: `studentId`, `classroomId`, `schoolId` do template OpenAPI;
- query: chaves do schema Zod (ex.: `examId` opcional).

## CI

Nenhuma alteração obrigatória em `.github/workflows/ci.yml`: `npm test` já executa `jest` na pasta `backend`, incluindo `tests/contract`.

Opcional (P3, fora do escopo): job dedicado `npm run test:contract` para feedback mais rápido em PRs grandes.

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| `framework` / campos com `.default()` no Zod vs `required` no OpenAPI | Aplicar regra documentada na spec (required = não optional no Zod). Ajustar OpenAPI se necessário. |
| `ExamRequest` mais rico que required mínimo | Comparar properties completas; required apenas campos obrigatórios Zod. |
| Nome de componente OpenAPI ≠ convenção | Mapear explicitamente no teste (`CorrectionByOrderRequest` ↔ `submitMarksByOrderSchema`). |
| Teste de alunos existente compara required com todas as keys | Não alterar comportamento no refactor P2 sem teste dedicado; corrigir só se falhar ao tocar arquivo. |
