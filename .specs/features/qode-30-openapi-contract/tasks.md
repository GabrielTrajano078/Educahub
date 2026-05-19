# Tasks — QODE-30 (ordem de execução)

Cada tarefa deve terminar com `npm run test:contract` (ou `npm test`) verde no escopo tocado.

## Fase 1 — Fundação

- [x] **T1** — Criar `tests/contract/openapi-contract-helpers.ts` com leitores genéricos de schema/path (REQ-OAPI-17).
- [x] **T2** — Refatorar `schools/classes/students` para usar helpers sem mudar asserções.

## Fase 2 — Novos contratos (TDD)

- [x] **T3** — `auth-openapi.contract.test.ts` (REQ-OAPI-01–04).
- [x] **T4** — `questions-openapi.contract.test.ts` (REQ-OAPI-05–08).
- [x] **T5** — `exams-openapi.contract.test.ts` (REQ-OAPI-09–12).
- [x] **T6** — `results-openapi.contract.test.ts` (REQ-OAPI-13–16).

## Fase 3 — Correções de drift

- [x] **T7** — `openapi.ts`: `ExamRequest` (+ blueprint, questionCount, voidedQuestionIds); GET `/api/exams` (+ framework, descriptor, axis).
- [x] **T8** — Export `patchProfessorClassroomsSchema` em `users.routes.ts` para contrato auth.

## Fase 4 — Verificação final

- [x] **T9** — `npm test` completo no backend (180 testes).
- [ ] **T10** — Atualizar comentário em `openapi.ts` ou README do backend mencionando cobertura de contrato (1 parágrafo, se a equipa quiser).

## Estimativa

| Fase | Esforço |
|------|---------|
| F1 helpers | ~1h |
| F2 quatro módulos | ~3–4h |
| F3 drift | ~1–2h (variável) |
| **Total** | ~1 dia de dev |

## Commit sugerido (atômicos)

1. `test(contract): add openapi contract helpers`
2. `test(contract): auth openapi alignment`
3. `test(contract): questions openapi alignment`
4. `test(contract): exams openapi alignment`
5. `test(contract): results openapi alignment`
6. `docs(openapi): fix drift found by contract tests` (se T7 alterar spec)
