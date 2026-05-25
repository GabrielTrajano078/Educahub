# Escola — normalização de nome (`name` + `normalizedName`)

| Campo | Valor |
| --- | --- |
| Issue | QODE-40 |
| Bloco | Qualidade de dados (21/05/2026) |
| Relacionadas | QODE-41 (Alunos), QODE-42 (Turma) |
| Ordem recomendada | **Escola antes** de turma/aluno (`schoolId`, `municipalityCode` propagam escopo) |
| Status | Especificação |

---

## 1. Contexto

A entidade **Escola** é a raiz da hierarquia organizacional da plataforma SAEB/Scorefy:

```
Escola → Turma → Aluno
```

Ela sustenta:

- escopo de acesso (RBAC);
- agregações pedagógicas por município;
- snapshots em cartões-resposta.

O cadastro de escolas **já existe** (CRUD na API, telas de listagem/cadastro/edição, autocomplete de cidade via IBGE — QODE-8, ações de editar/excluir — QODE-7). Porém, os dados persistidos e as regras de entrada/saída **ainda não seguem** o mesmo padrão de normalização aplicado (ou previsto) para turmas e alunos.

Esta especificação define a padronização de persistência e leitura para que toda exibição do nome da escola no frontend use o valor canônico derivado no servidor.

---

## 2. Decisão de modelo

Persistir **dois campos** para o nome da escola:

| Campo | Papel | Exemplo |
| --- | --- | --- |
| `name` | Valor informado no cadastro/edição (POST/PATCH); persiste o texto limpo digitado pelo usuário | `Teste João` |
| `normalizedName` | Valor canônico para leitura — derivado no servidor; usado em GET e em toda exibição no front | `TESTE JOAO` |

### 2.1 Regra de exibição (frontend)

Sempre que o nome da escola vier de um **GET** (`GET /api/schools`, `GET /api/schools/:id` ou qualquer payload que embute escola), o frontend deve renderizar **`normalizedName`**, não `name`.

Isso vale para:

- listagem de escolas;
- coluna/título em tabelas;
- selects e filtros que mostram escola;
- resumo da escola;
- dashboard;
- diálogos de confirmação (ex.: excluir);
- links e labels derivados de dados carregados via API.

No **formulário** de cadastro/edição, o usuário continua digitando e enviando apenas `name`. Após salvar, as telas de leitura passam a mostrar o `normalizedName` retornado pelo GET.

### 2.2 Algoritmo de `normalizedName` (obrigatório, determinístico)

Aplicar **nesta ordem** sobre `name` já limpo:

1. `trim` nas extremidades
2. Colapsar espaços internos consecutivos em um único espaço
3. Remover diacríticos (NFD + strip de marcas combinantes) — `João` → `Joao`
4. `toLocaleUpperCase("pt-BR")`

| `name` | `normalizedName` (exibido no front após GET) |
| --- | --- |
| `Teste João` | `TESTE JOAO` |
| `EMEF   José de Alencar` | `EMEF JOSE DE ALENCAR` |

**Implementação:**

- [ ] Função pura reutilizável (`normalizeSchoolName`) — rotas, migração e testes unitários
- [ ] Recalcular `normalizedName` em todo CREATE/PATCH que altere `name`
- [ ] **Não** aceitar `normalizedName` no body da API (rejeitar via schema `.strict()`)

**Arquivo sugerido:** `backend/src/lib/normalize-school-name.ts`

---

## 3. Situação atual (baseline)

### 3.1 Backend

| Item | Estado atual |
| --- | --- |
| Coleção `School` | `name`, `city`, `municipalityCode` — **sem** `normalizedName` |
| Índice | `{ municipalityCode: 1, name: 1 }` |
| CREATE/PATCH | Persiste `name` do body; não deriva `normalizedName` |
| GET | Não devolve `normalizedName` |
| Busca `nameContains` | Regex em `name` (case-insensitive) |
| OpenAPI `School` | `required: ["_id", "name"]` — sem `normalizedName` |

### 3.2 Frontend

| Item | Estado atual |
| --- | --- |
| Schema/tipo `School` | Apenas `name` |
| Telas de leitura | Exibem `school.name` |
| Formulário | Envia `name` (correto) |

---

## 4. Objetivo

Padronizar persistência (`name` + `normalizedName` + IBGE) e garantir que:

1. toda leitura via GET exponha `normalizedName` (obrigatório, não omitir);
2. o front **sempre** use `normalizedName` para exibir o nome da escola em telas alimentadas por GET;
3. cadastro/edição continuem usando apenas `name` no body.

---

## 5. Requisitos técnicos

### 5.1 Backend — modelo e escrita

| # | Requisito |
| --- | --- |
| B1 | Campo `normalizedName` obrigatório no Mongoose (`required: true`) |
| B2 | Helper `normalizeSchoolName(name: string): string` — função pura conforme §2.2 |
| B3 | CREATE (`POST /api/schools`): entrada só em `name`; derivar e persistir `normalizedName` no servidor |
| B4 | PATCH (`PATCH /api/schools/:id`): se `name` presente, recalcular `normalizedName`; se PATCH só `city`/`municipalityCode`, `normalizedName` inalterado |
| B5 | `city` / `municipalityCode` conforme regras anteriores (trim, IBGE 7 dígitos, escopo gestor) |
| B6 | Body da API: `createSchoolSchema` / `updateSchoolSchema` com `.strict()` — rejeitar `normalizedName` no payload |

**Modelo Mongoose (alvo):**

```ts
interface SchoolDocument {
  name: string;
  normalizedName: string;
  city?: string;
  municipalityCode?: string;
}
```

**Índices (alvo):**

- Remover: `{ municipalityCode: 1, name: 1 }`
- Adicionar (parcial/sparse conforme necessário): índice único `{ municipalityCode: 1, normalizedName: 1 }` **quando** `municipalityCode` estiver presente
- Colisão na escrita → HTTP **409** com mensagem clara

### 5.2 Backend — leitura (GET)

| # | Requisito |
| --- | --- |
| B7 | `GET /api/schools` e `GET /api/schools/:id`: incluir `normalizedName` em cada item (obrigatório no JSON) |
| B8 | Manter `name` na resposta para pré-preencher formulário de edição |
| B9 | OpenAPI: schema `School` com `name` + `normalizedName` em `required` |
| B10 | Busca `nameContains`: normalizar a query com `normalizeSchoolName` e filtrar preferencialmente por `normalizedName` (regex escapado) |
| B11 | Ordenação da listagem: preferir `normalizedName` (ordem canônica de exibição) |

**Serialização:** garantir que documentos `.lean()` incluam `normalizedName`; não omitir em transformações intermediárias.

### 5.3 Frontend — exibição (leitura)

| # | Requisito |
| --- | --- |
| F1 | Schema Zod / tipo `School`: `normalizedName: z.string()` (obrigatório em respostas GET) |
| F2 | Regra global: componentes que mostram nome de escola a partir da API usam `school.normalizedName`, **nunca** `school.name` como label visível |
| F3 | Telas impactadas (revisar todas as referências): |

- `SchoolsPage` — listagem
- `SchoolSummaryPage` — resumo
- `DashboardHomePage` — dashboard
- `ClassesPage` / `ClassesListFilters` — filtros com escola
- `StudentsListFilters` — filtros com escola
- `ClassroomPage`, `ExamNewPage`, `MunicipalityPage`
- `NewClassroomForm` — selects
- Diálogo de exclusão de escola
- Navegação com título de escola

| # | Requisito |
| --- | --- |
| F4 | Testes de UI/componente: listagem renderiza `normalizedName` quando mock de GET traz ambos os campos |

### 5.4 Frontend — cadastro/edição (escrita)

| # | Requisito |
| --- | --- |
| F5 | Formulário envia apenas `name` no POST/PATCH (comportamento atual) |
| F6 | Ao abrir edição (`GET /:id`), pré-preencher input com `name` |
| F7 | Após salvar com sucesso, listagem/resumo via GET → usuário vê `normalizedName` |
| F8 | Tratar HTTP **409** (duplicata no município) com feedback ao usuário |

### 5.5 Migração, contrato e testes

| # | Requisito |
| --- | --- |
| M1 | Script de backfill: calcular `normalizedName` para todos os documentos existentes |
| M2 | Relatório de colisões (`municipalityCode` + `normalizedName` duplicados) para resolução manual — **não** aplicar índice único até colisões zeradas |
| M3 | Após backfill limpo: criar índice único e remover índice legado `municipalityCode_1_name_1` |
| M4 | Script de rollback documentado (`rollback-school-normalized-name.ts`) |
| M5 | Contrato OpenAPI atualizado |
| M6 | Testes de integração: CREATE, PATCH name, PATCH só city, 409 duplicata, GET com ambos os campos |
| M7 | Testes unitários do helper com tabela de exemplos §2.2 |
| M8 | Testes de schema: rejeitar `normalizedName` no body |

---

## 6. API — contrato

### 6.1 Request (`SchoolRequest`)

Sem alteração de campos aceitos:

```json
{
  "name": "Teste João",
  "city": "Fortaleza",
  "municipalityCode": "2304400"
}
```

`normalizedName` → **400** (schema strict).

### 6.2 Response (`School`)

```json
{
  "_id": "…",
  "name": "Teste João",
  "normalizedName": "TESTE JOAO",
  "city": "Fortaleza",
  "municipalityCode": "2304400",
  "createdAt": "…",
  "updatedAt": "…"
}
```

OpenAPI `School.required`: `["_id", "name", "normalizedName"]`

### 6.3 Erros

| Código | Condição |
| --- | --- |
| 400 | Payload inválido; `normalizedName` no body; IBGE inválido |
| 403 | Gestor sem município ou escola fora do escopo |
| 404 | Escola não encontrada |
| 409 | Duplicata `{ municipalityCode, normalizedName }` |

---

## 7. Migração de dados

### 7.1 Fluxo

```mermaid
flowchart TD
  A[Conectar MongoDB] --> B[Para cada School: normalizedName = normalizeSchoolName(name)]
  B --> C{Agrupar por municipalityCode + normalizedName}
  C -->|Colisões| D[Emitir relatório JSON/console]
  C -->|Sem colisões| E[Criar índice único municipalityCode + normalizedName]
  E --> F[Remover índice municipalityCode + name]
  D --> G[Resolução manual offline]
  G --> B
```

### 7.2 Script de migração e ledger

**Arquivos:** `backend/src/scripts/migrate-school-normalized-name.ts`, `backend/src/lib/migrations/migration-ledger.ts`

**Ledger:** coleção `app_migrations` com `{ name: "school-normalized-name-v1", appliedAt }`. Após a primeira aplicação bem-sucedida, startup e CLI **não** reescaneiam a coleção (consulta única ao ledger).

Comportamento:

1. Backfill em lote por cursor (somente se v1 ainda não estiver no ledger).
2. Listar pares `(municipalityCode, normalizedName)` com `count > 1`.
3. Exit code ≠ 0 se houver colisões (CI/ops pode falhar de propósito).
4. Registrar `school-normalized-name-v1` em `app_migrations`.
5. CLI `--force` reexecuta sem depender do ledger (dev/ops).
6. Evolução do algoritmo → nova migração `school-normalized-name-v2` (não reutilizar v1).

### 7.3 Rollback

`backend/src/scripts/rollback-school-normalized-name.ts`:

- `$unset` de `normalizedName` em todos os documentos;
- drop índice `municipalityCode_1_normalizedName_1`;
- recriar índice legado `{ municipalityCode: 1, name: 1 }`.

---

## 8. Arquivos impactados (checklist de implementação)

### Backend

| Arquivo | Ação |
| --- | --- |
| `src/lib/normalize-school-name.ts` | **Criar** helper |
| `src/modules/schools/school.model.ts` | Campo + índice |
| `src/modules/schools/schools.routes.ts` | Derivar nome; 409; busca; sort |
| `src/modules/schools/schools.schemas.ts` | `.strict()`; validação |
| `src/docs/openapi.ts` | Schema `School` |
| `src/scripts/migrate-school-normalized-name.ts` | **Criar** migração |
| `src/scripts/rollback-school-normalized-name.ts` | Manter/alinhar |
| `tests/unit/normalize-school-name.test.ts` | **Criar** |
| `tests/unit/schools.schemas.test.ts` | Rejeitar `normalizedName` |
| `tests/integration/schools.integration.test.ts` | GET, 409, PATCH |
| `tests/contract/schools-openapi.contract.test.ts` | Contrato |

### Frontend

| Arquivo | Ação |
| --- | --- |
| `web/src/schemas/school.ts` | `normalizedName` |
| `web/src/api/schools.test.ts` | Mock com ambos campos |
| Páginas/componentes listados em F3 | `normalizedName` na UI |
| Testes de página (`SchoolsPage.test.tsx`, etc.) | Assert em `normalizedName` |

---

## 9. Critérios de aceite

- [ ] GET de escolas sempre retorna `normalizedName`
- [ ] Front não usa `name` para exibir escola em telas alimentadas por GET (somente `normalizedName`)
- [ ] Cadastro/edição continua usando `name` no body; após persistir, GET reflete `normalizedName` correto
- [ ] Duplicata no município → **409**; IBGE inválido → **400**
- [ ] Testes backend + front (exibição) verdes na CI

---

## 10. Cenários de QA (manual)

| # | Cenário | Resultado esperado |
| --- | --- | --- |
| 1 | POST `name`: `Teste João` → GET listagem | Coluna/nome visível: `TESTE JOAO` (`normalizedName`) |
| 2 | Abrir editar escola | Input pré-preenchido com `name` (`Teste João`); listagem ainda mostra `normalizedName` |
| 3 | POST duplicata no mesmo IBGE | **409** |
| 4 | Resumo da escola / dashboard | Título/label da escola = `normalizedName` |
| 5 | PATCH só `city` | `normalizedName` inalterado na listagem |
| 6 | PATCH `name` | GET/listagem atualiza `normalizedName` |

---

## 11. Fora de escopo

- Normalização de **turma** (QODE-42) e **aluno** (QODE-41)
- Alterar `schoolSnapshot` em cartões-resposta já emitidos
- Mudanças em RBAC além do necessário para manter escopo gestor/município existente

---

## 12. Referências no repositório

- Modelo atual: `backend/src/modules/schools/school.model.ts`
- Rotas: `backend/src/modules/schools/schools.routes.ts`
- Schemas Zod: `backend/src/modules/schools/schools.schemas.ts`
- OpenAPI: `backend/src/docs/openapi.ts` (`School`, `SchoolRequest`)
- Frontend schema: `web/src/schemas/school.ts`
