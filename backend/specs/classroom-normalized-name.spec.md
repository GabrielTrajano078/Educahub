# Turma — normalização de nome (`name` + `normalizedName`)

| Campo | Valor |
| --- | --- |
| Issue | QODE-42 |
| Relacionadas | QODE-40 (Escola), QODE-41 (Aluno) |
| Pré-requisito | QODE-40 concluída |
| Spec irmã | [`school-normalized-name.spec.md`](./school-normalized-name.spec.md) |

---

## Decisão de modelo

| Campo | Papel | Exemplo |
| --- | --- | --- |
| `name` | Entrada POST/PATCH/importação | `5A Manhã` |
| `normalizedName` | Canônico para GET e exibição | `5A MANHA` |

Mesmo algoritmo de `normalize-person-name` (QODE-40). Índice único `{ schoolId, normalizedName }`. Ledger `classroom-normalized-name-v1`.

## Frontend

Telas alimentadas por `GET /api/classes` usam `normalizedName` (`classroomDisplayName` / `classroomOptionLabel`). Formulários e importação Excel continuam enviando `name`.

## Fora de escopo

- `classroomSnapshot` em provas/cartões já emitidos
- Resumo agregado (`fetchSchoolSummary`) — continua com `name` do snapshot até evolução da API de resultados

## Critérios de aceite

- [ ] GET retorna `normalizedName`
- [ ] Front exibe `normalizedName` em listagens/modais de turma via API de classes
- [ ] Duplicata na mesma escola → 409
- [ ] Migração registrada em `app_migrations`
