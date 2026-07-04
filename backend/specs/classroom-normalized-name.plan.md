# Plano — QODE-42 Turma (`name` + `normalizedName`)

**Spec:** [`classroom-normalized-name.spec.md`](./classroom-normalized-name.spec.md)  
**Issue:** QODE-42  
**Status:** Implementado (código + testes; migração via startup/CLI)  
**Pré-requisito:** QODE-40 (helper compartilhado `normalize-person-name`)  
**Escopo:** Backend → migração → contrato/testes → frontend → QA manual

---

## Resumo executivo

Espelha QODE-40 (escola): campo canônico `normalizedName`, índice único `{ schoolId, normalizedName }`, ledger `classroom-normalized-name-v1`.

| Fase | Entrega |
| --- | --- |
| 1 | `normalize-classroom-name.ts` + testes unitários |
| 2 | Modelo, rotas, schemas `.strict()` |
| 3 | OpenAPI + testes integração/contrato |
| 4 | Migração CLI + startup (`migrate:classes`) |
| 5 | Frontend (`classroomDisplayName`, `classroomOptionLabel`) |
| 6 | QA manual |

**Ordem no startup:** escola → turma → aluno.

---

## Arquivos principais

| Área | Arquivo |
| --- | --- |
| Helper | `backend/src/lib/normalize-classroom-name.ts` |
| Migração | `backend/src/lib/migrations/migrate-classroom-normalized-name.ts` |
| Modelo | `backend/src/modules/classes/classroom.model.ts` |
| Rotas | `backend/src/modules/classes/classes.routes.ts` |
| CLI | `npm run migrate:classes` |
| Front schema | `web/src/schemas/classroom.ts` |

---

## Fora de escopo (documentado na spec)

- Snapshots em provas/resultados (`classroom.name` em APIs de report/resumo)
- `SchoolSummaryPage` tabela agregada — continua `c.name` do endpoint de resultados

---

## Critérios de aceite

- [x] GET `/api/classes` retorna `normalizedName`
- [x] POST/PATCH derivam `normalizedName` de `name`
- [x] Duplicata na mesma escola → 409
- [x] Migração registrada em `app_migrations`
- [x] Front exibe `normalizedName` onde consome `listClassrooms`
- [ ] QA manual em ambiente com dados legados

---

## QA manual sugerido

1. Criar turma `5A Manhã` → listagem mostra `5A MANHA`
2. Tentar duplicata `5a manha` na mesma escola → erro 409
3. Busca por `manha` encontra a turma
4. Rodar `npm run migrate:classes -- --force` em cópia do banco e validar ledger
