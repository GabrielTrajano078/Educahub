# Plano — QODE-41 Aluno (`fullName` + `normalizedFullName`)

**Spec:** [`student-normalized-full-name.spec.md`](./student-normalized-full-name.spec.md)  
**Issue:** QODE-41  
**Pré-requisito:** QODE-40 mergeada/deployada (escola + ledger `app_migrations`)  
**Status:** Aprovado para execução  
**Escopo:** Refatoração helper compartilhado → backend → migração → contrato/testes → frontend → QA manual

---

## Resumo executivo

| Fase | Entrega | Bloqueia |
| --- | --- | --- |
| 0 | Extrair `normalize-person-name` (reuso QODE-40) | Helper do aluno |
| 1 | `normalizeStudentFullName` + testes | Backend aluno |
| 2 | Modelo + rotas + schemas + list-scope | GET/POST/PATCH |
| 3 | OpenAPI + testes backend | Contrato e CI |
| 4 | Migração + ledger v1 | Deploy com dados |
| 5 | Frontend + testes UI | Aceite visível |
| 6 | QA manual | Fechamento QODE-41 |

**Ordem crítica:** QODE-40 em produção → Fases 0–3 → migração (Fase 4) → front (Fase 5).

**Estimativa total:** ~1,5–2 dias de dev (1 dev), assumindo poucas colisões `(classroomId, normalizedFullName)`.

---

## Plano de execução

### Visão geral

```
Fase 0:  T0
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
| 0 | Não | Evita duplicar algoritmo |
| 1 | Não | Wrapper + testes |
| 2 | Não | Modelo → rotas → list-scope |
| 3 | Parcial | T7 [P] após T5 |
| 4 | Não | Após backend estável |
| 5 | Parcial | T12 [P] após T11 |
| 6 | Não | QA spec §10 |

---

## Fase 0 — Helper compartilhado (reuso QODE-40)

### T0: Extrair `normalize-person-name`

**O quê:** Mover algoritmo de `normalize-school-name.ts` para `normalize-person-name.ts`; `normalizeSchoolName` e novo `normalizeStudentFullName` delegam ao núcleo. Manter exports e testes da escola verdes.

**Onde:**

- `backend/src/lib/normalize-person-name.ts` (**criar**)
- `backend/src/lib/normalize-school-name.ts` (wrapper)
- `backend/src/lib/normalize-student-full-name.ts` (**criar** wrapper)

**Depende de:** QODE-40 implementado

**Requisitos:** Spec §2.2 (aluno), reutilização QODE-40

**Feito quando:**

- [ ] `normalizeSchoolName` continua com mesma assinatura/comportamento
- [ ] `normalizeStudentFullName` exportado
- [ ] `npm test -- normalize-school-name` verde
- [ ] Sem regressão nos testes de escola

**Commit sugerido:** `refactor: extract normalize-person-name shared by school and student`

---

## Fase 1 — Fundação aluno

### T1: Wrapper e documentação do helper

**O quê:** Garantir `normalize-student-full-name.ts` exporta `normalizeStudentFullName` delegando a `normalize-person-name`.

**Onde:** `backend/src/lib/normalize-student-full-name.ts`

**Depende de:** T0

**Requisitos:** B2

**Feito quando:**

- [ ] Função pura documentada para QODE-41
- [ ] `npm run check` sem erros

**Commit sugerido:** `feat(students): add normalizeStudentFullName helper`

---

### T2: Testes unitários do helper aluno

**O quê:** Casos §2.2 + letras espaçadas + bordas (trim, vazio, acentos).

**Onde:** `backend/tests/unit/normalize-student-full-name.test.ts`

**Depende de:** T1

**Requisitos:** M7

**Feito quando:**

- [ ] `Ana Clara Sousa` → `ANA CLARA SOUSA`
- [ ] `J o s e   d e   S o u z a` → `JOSE DE SOUZA`
- [ ] `npm test -- normalize-student-full-name` verde

**Commit sugerido:** `test(students): unit tests for normalizeStudentFullName`

---

## Fase 2 — Modelo e API

### T3: Modelo Mongoose `Student`

**O quê:** Campo `normalizedFullName` obrigatório; índice único `{ classroomId: 1, normalizedFullName: 1 }`; manter único em `registrationCode`.

**Onde:** `backend/src/modules/students/student.model.ts`

**Depende de:** T1

**Requisitos:** B1, índices §5.1

**Feito quando:**

- [ ] `normalizedFullName: { type: String, required: true }`
- [ ] Índice único `classroomId + normalizedFullName` no schema

**Commit sugerido:** `feat(students): add normalizedFullName to Student model`

---

### T4: Schemas Zod (entrada)

**O quê:** `.strict()` em `createStudentSchema` e `updateStudentSchema`; rejeitar `normalizedFullName` no body.

**Onde:** `backend/src/modules/students/students.schemas.ts`

**Depende de:** —

**Requisitos:** B6, M8

**Feito quando:**

- [ ] Payload com `normalizedFullName` falha com `unrecognized_keys`
- [ ] Teste em `students.schemas.test.ts` (**criar** se não existir)

**Commit sugerido:** `feat(students): reject normalizedFullName in request body`

---

### T5: Rotas POST/PATCH/GET + 409 + list-scope

**O quê:**

- POST: derivar `normalizedFullName` de `fullName` (trim)
- PATCH: recalcular só se `fullName` no body
- GET: resposta inclui ambos; sort `normalizedFullName`
- `fullNameContains`: normalizar query → filtro em `normalizedFullName`
- 409: distinguir matrícula (código 11000 em `registrationCode`) vs nome na turma (índice composto)
- Atualizar `students-list-scope.ts` (busca)

**Onde:**

- `backend/src/modules/students/students.routes.ts`
- `backend/src/modules/students/students-list-scope.ts`
- `backend/src/modules/students/students.server-logic.ts` (mensagens 409, se centralizar)

**Depende de:** T1, T3, T4

**Requisitos:** B3–B5, B7–B11, 409 §6.3

**Feito quando:**

- [ ] POST `Ana Clara Sousa` persiste `normalizedFullName: ANA CLARA SOUSA`
- [ ] PATCH só `registrationCode` não altera `normalizedFullName`
- [ ] Duplicata matrícula → 409 mensagem atual
- [ ] Duplicata nome na turma → 409 mensagem nova

**Commit sugerido:** `feat(students): derive normalizedFullName on write and expose on GET`

---

## Fase 3 — Contrato e testes backend

### T6: OpenAPI schema `Student`

**O quê:** Criar componente `Student` com `fullName` + `normalizedFullName` em `required`; GET 200 referencia array/items.

**Onde:** `backend/src/docs/openapi.ts`

**Depende de:** T5

**Requisitos:** B9, M6

**Feito quando:**

- [ ] `Student.required` inclui `normalizedFullName`
- [ ] `StudentRequest` inalterado (sem `normalizedFullName`)

**Commit sugerido:** `docs(openapi): document Student.normalizedFullName`

---

### T7: Testes de integração [P]

**O quê:** CREATE, GET com ambos campos, PATCH fullName, PATCH só registrationCode, 409 matrícula, 409 nome turma, `fullNameContains` em `normalizedFullName`.

**Onde:** `backend/tests/integration/students.integration.test.ts`

**Depende de:** T5

**Requisitos:** M6

**Feito quando:**

- [ ] `npm test -- students.integration` verde

**Commit sugerido:** `test(students): integration coverage for normalizedFullName`

---

### T8: Teste de contrato OpenAPI

**O quê:** `students-openapi.contract.test.ts` valida schema `Student` e propriedades.

**Onde:** `backend/tests/contract/students-openapi.contract.test.ts`

**Depende de:** T6

**Requisitos:** M6

**Feito quando:**

- [ ] `npm run test:contract` (ou filtro students) verde

**Commit sugerido:** `test(contract): students schema includes normalizedFullName`

**Gate Fase 3:** `cd backend && npm test` verde.

---

## Fase 4 — Migração de dados

### T9: Migração + ledger + CLI

**O quê:**

- `migrate-student-normalized-full-name.ts` com backfill, relatório de colisões, ledger `student-normalized-full-name-v1`
- Script CLI `migrate-student-normalized-name.ts`
- `npm run migrate:students` + `--force`
- Registrar no `server.ts` em `runStartupMigrations` (após migração escola)

**Onde:**

- `backend/src/lib/migrations/migrate-student-normalized-full-name.ts`
- `backend/src/lib/migrations/student-normalized-full-name.constants.ts`
- `backend/src/scripts/migrate-student-normalized-full-name.ts`
- `backend/src/server.ts`
- `backend/package.json` (script)

**Depende de:** T3, ledger QODE-40

**Requisitos:** M1–M4

**Feito quando:**

- [ ] Segunda execução skip (ledger)
- [ ] Colisões listadas com `classroomId` + `normalizedFullName`
- [ ] Exit code 2 se colisões

**Commit sugerido:** `chore(students): migration script with app_migrations ledger`

---

### T10: Aplicar índice em ambiente limpo

**O quê:** Após zerar colisões, rodar migração com índice; validar rollback script.

**Depende de:** T9 (zero colisões)

**Requisitos:** M2, M5

**Feito quando:**

- [ ] Índice `classroomId_1_normalizedFullName_1` presente
- [ ] Documento em `app_migrations` com `student-normalized-full-name-v1`

**Nota:** Operação de deploy/ops; pode ser evidência no ticket Jira.

---

### T11 (rollback): Script de rollback

**O quê:** `rollback-student-normalized-full-name.ts` — unset campo, drop índice, opcional remover ledger.

**Onde:** `backend/src/scripts/rollback-student-normalized-full-name.ts`

**Depende de:** T9

**Requisitos:** M5

**Commit sugerido:** `chore(students): rollback script for normalizedFullName`

---

## Fase 5 — Frontend

### T11: Schema e API client

**O quê:**

- Tipo `Student` com `normalizedFullName`
- `studentDisplayName(student)` helper
- `listStudents` / parse Zod validando campo obrigatório

**Onde:**

- `web/src/schemas/student.ts` (**criar** ou em `api/students.ts`)
- `web/src/api/students.ts`
- `web/src/api/students.test.ts` (**criar** se não existir)

**Depende de:** T8 (API estável)

**Requisitos:** F1, F2

**Feito quando:**

- [ ] Parse falha sem `normalizedFullName` no mock
- [ ] Parse ok com ambos os campos

**Commit sugerido:** `feat(web): Student schema with normalizedFullName`

---

### T12: Telas de leitura [P]

**O quê:** Substituir exibição `fullName` por `studentDisplayName` / `normalizedFullName` em leitura; manter `fullName` em inputs.

**Arquivos:**

| Arquivo | Ação |
| --- | --- |
| `web/src/pages/StudentsPage.tsx` | Tabela, aria-labels, diálogo excluir |
| `web/src/pages/students/StudentDialogs.tsx` | Modal Ver (leitura); Editar mantém input `fullName` |
| `web/src/components/BulkScanUpload.tsx` | Label quando origem é `Student` da API |

**Depende de:** T11

**Requisitos:** F3

**Commit sugerido:** `feat(web): display student normalizedFullName on read screens`

---

### T13: Formulário, importação e 409

**O quê:**

- POST/PATCH/import continuam só `fullName`
- Edição pré-preenche `fullName`
- Tratar 409 de matrícula vs 409 de nome na turma (mensagens distintas via `ApiError.message`)

**Onde:**

- `web/src/pages/StudentNewPage.tsx`
- `web/src/pages/students/StudentDialogs.tsx`
- `web/src/pages/StudentsPage.tsx` (import Excel)

**Depende de:** T11

**Requisitos:** F5–F8

**Commit sugerido:** `feat(web): handle student duplicate 409 on save and import`

---

### T14: Testes de componente/página

**O quê:** Listagem renderiza `normalizedFullName` quando mock traz ambos.

**Onde:**

- `web/src/pages/StudentsPage.test.tsx` (**criar** se ausente)
- `web/src/schemas/student.test.ts`

**Depende de:** T12

**Requisitos:** F4

**Feito quando:**

- [ ] `cd web && npm test` verde nos arquivos tocados

**Commit sugerido:** `test(web): students list shows normalizedFullName`

**Gate Fase 5:** smoke: cadastrar aluno → listagem mostra nome normalizado.

---

## Fase 6 — QA e fechamento

### T15: QA manual + critérios de aceite

**O quê:** Executar tabela spec §10 (7 cenários) e marcar critérios §9 no Jira.

**Depende de:** T10 (ambiente com migração), T14

**Feito quando:**

- [ ] Cenários 1–7 OK
- [ ] CI verde (backend + web)

---

## Rastreabilidade spec → tarefas

| Requisito | Tarefa(s) |
| --- | --- |
| B1–B2 | T0, T1, T2 |
| B3–B6 | T4, T5 |
| B7–B11 | T5 |
| B9, M6 | T6, T8 |
| M6 integração | T7 |
| M1–M5 | T9, T10, T11 rollback |
| M7 | T2 |
| M8 | T4 |
| F1–F2 | T11 |
| F3 | T12 |
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
cd backend && npm run migrate:students
cd backend && npm run migrate:students -- --force

# Web — após Fase 5
cd web && npm test

# Busca regressão exibição
rg 'student\.fullName|s\.fullName' web/src/pages web/src/components
```

---

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Colisões `(classroomId, normalizedFullName)` no backfill | Relatório T9; correção manual antes de T10 |
| Gêmeos/homônimos na mesma turma | Regra de negócio: 409 — ajustar `fullName` ou turma |
| Regressão QODE-40 ao extrair helper | T0 + manter testes `normalize-school-name` |
| `studentSnapshot` histórico desatualizado | Fora de escopo; documentar no PR |
| Duas migrações no startup | Ledgers independentes; ordem escola → aluno no `server.ts` |

---

## Ordem sugerida de PRs

1. **PR1 — Refatoração + backend:** T0–T8 (helper compartilhado, aluno, OpenAPI, testes)
2. **PR2 — Migração:** T9–T11 (scripts + startup)
3. **PR3 — Frontend:** T12–T14

Alternativa: **PR único** QODE-41 se o time preferir entrega atômica.

---

## Fora deste plano

- QODE-42 (Turma)
- Alteração de `studentSnapshot` em documentos históricos
- `GET /api/students/:id` (opcional na spec)
