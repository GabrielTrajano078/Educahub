# Aluno — normalização de nome (`fullName` + `normalizedFullName`)

| Campo | Valor |
| --- | --- |
| Issue | QODE-41 |
| Bloco | Qualidade de dados (21/05/2026) |
| Relacionadas | QODE-40 (Escola — **pré-requisito**), QODE-42 (Turma) |
| Ordem recomendada | Escola (QODE-40) → **Aluno (esta issue)** → Turma (QODE-42) |
| Status | Especificação |
| Spec irmã | [`school-normalized-name.spec.md`](./school-normalized-name.spec.md) |

---

## 1. Contexto

A entidade **Aluno** pertence à hierarquia:

```
Escola → Turma → Aluno
```

Ela sustenta:

- vínculo escola/turma e escopo RBAC (professor, coordenador, gestor, admin);
- listagens, filtros e cadastro manual/importação em planilha;
- snapshots em cartões-resposta e resultados (`studentSnapshot`).

O cadastro de alunos **já existe** (CRUD na API, listagem com filtros, modal de cadastro/edição, importação Excel, exclusão em cascata de cartões/resultados). Porém, o nome persistido (`fullName`) é exibido **como digitado**, sem valor canônico para leitura, busca e unicidade por turma.

**Pré-requisito:** QODE-40 (Escola) concluída — padrão de normalização, ledger `app_migrations` e helpers reutilizáveis.

Esta especificação espelha o modelo da escola, adaptado ao campo `fullName` do aluno.

---

## 2. Decisão de modelo

Persistir **dois campos** para o nome do aluno:

| Campo | Papel | Exemplo |
| --- | --- | --- |
| `fullName` | Valor informado no cadastro/edição/importação (POST/PATCH); texto limpo digitado pelo usuário | `Ana Clara Sousa` |
| `normalizedFullName` | Valor canônico para leitura — derivado no servidor; usado em GET e em toda exibição no front | `ANA CLARA SOUSA` |

**Nota:** Não usar o nome genérico `normalizedName` no documento `Student`, para não confundir com `School.normalizedName`. O par semântico é `fullName` / `normalizedFullName`.

### 2.1 Regra de exibição (frontend)

Sempre que o nome do aluno vier de um **GET** (`GET /api/students` ou qualquer payload que embute aluno — ex.: listagens, modais abertos a partir da API), o frontend deve renderizar **`normalizedFullName`**, não `fullName`.

Isso vale para:

- listagem de alunos (`StudentsPage`);
- modais Ver / Editar / Excluir (`StudentDialogs`);
- labels em upload de cartões (`BulkScanUpload`) quando o dado vem da API de alunos;
- colunas e `aria-label` derivados de dados carregados via GET.

**Fora desta regra (continua `fullName`):**

- inputs de cadastro/edição (`NewStudentForm`, `StudentEditModal`);
- importação Excel (envio de `fullName` no POST);
- `studentSnapshot` em cartões/resultados **já emitidos** (fora de escopo).

No **formulário**, o usuário continua digitando e enviando apenas `fullName`. Após salvar, as telas de leitura mostram `normalizedFullName` retornado pelo GET.

### 2.2 Algoritmo de `normalizedFullName` (obrigatório, determinístico)

**Mesma regra de QODE-40**, aplicada sobre `fullName`:

1. `trim` nas extremidades
2. Colapsar espaços internos consecutivos em um único espaço
3. Reconstruir nomes digitados com **espaço entre letras** (ex.: `J o s e` → `JOSE`) e separar preposições (`de`, `da`, `do`, `dos`, `das`)
4. Remover diacríticos (NFD + strip de marcas combinantes) — `João` → `Joao`
5. `toLocaleUpperCase("pt-BR")`

| `fullName` | `normalizedFullName` (exibido no front após GET) |
| --- | --- |
| `Ana Clara Sousa` | `ANA CLARA SOUSA` |
| `José   da Silva` | `JOSE DA SILVA` |
| `J o s e   d e   S o u z a` | `JOSE DE SOUZA` |

**Implementação:**

- [ ] Reutilizar núcleo de `normalizeSchoolName` (extrair para `normalize-person-name.ts` **ou** exportar `normalizeStudentFullName` que delega ao mesmo algoritmo)
- [ ] Recalcular `normalizedFullName` em todo CREATE/PATCH que altere `fullName`
- [ ] **Não** aceitar `normalizedFullName` no body da API (schema `.strict()`)

**Arquivo sugerido:** `backend/src/lib/normalize-student-full-name.ts` (wrapper fino) ou `normalize-person-name.ts` (compartilhado)

---

## 3. Situação atual (baseline)

### 3.1 Backend

| Item | Estado atual |
| --- | --- |
| Coleção `Student` | `schoolId`, `classroomId`, `fullName`, `registrationCode` — **sem** `normalizedFullName` |
| Índice único | `{ registrationCode: 1 }` (global) |
| CREATE/PATCH | Persiste `fullName` do body; não deriva `normalizedFullName` |
| GET ` /api/students` | Retorna `fullName`; ordenação `{ fullName: 1 }` |
| Busca `fullNameContains` | Regex em `fullName` (case-insensitive) |
| OpenAPI | `StudentRequest` definido; **sem** schema `Student` de resposta com campos obrigatórios |
| GET ` /api/students/:id` | **Não existe** (edição usa objeto da listagem) |

### 3.2 Frontend

| Item | Estado atual |
| --- | --- |
| Tipo em `web/src/api/students.ts` | Apenas `fullName` |
| Telas de leitura | Exibem `student.fullName` |
| Formulário / importação | Enviam `fullName` (correto) |
| 409 | Apenas código de matrícula duplicado |

---

## 4. Objetivo

Padronizar persistência (`fullName` + `normalizedFullName`) e garantir que:

1. toda leitura via GET exponha `normalizedFullName` (obrigatório, não omitir);
2. o front **sempre** use `normalizedFullName` para exibir o nome do aluno em telas alimentadas por GET;
3. cadastro/edição/importação continuem usando apenas `fullName` no body;
4. duplicidade de nome na **mesma turma** e de matrícula continuem com **409** explícito.

---

## 5. Requisitos técnicos

### 5.1 Backend — modelo e escrita

| # | Requisito |
| --- | --- |
| B1 | Campo `normalizedFullName` obrigatório no Mongoose (`required: true`) |
| B2 | Helper `normalizeStudentFullName(fullName: string): string` — mesmo algoritmo §2.2 |
| B3 | CREATE (`POST /api/students`): entrada só em `fullName`; derivar e persistir `normalizedFullName` no servidor |
| B4 | PATCH (`PATCH /api/students/:id`): se `fullName` presente, recalcular `normalizedFullName`; se PATCH só `registrationCode`/`classroomId`, `normalizedFullName` inalterado |
| B5 | `schoolId`, `classroomId`, `registrationCode` conforme regras atuais (escopo RBAC, turma pertence à escola) |
| B6 | `createStudentSchema` / `updateStudentSchema` com `.strict()` — rejeitar `normalizedFullName` no payload |

**Modelo Mongoose (alvo):**

```ts
interface StudentDocument {
  schoolId: Types.ObjectId;
  classroomId: Types.ObjectId;
  fullName: string;
  normalizedFullName: string;
  registrationCode: string;
}
```

**Índices (alvo):**

- Manter: índice único `{ registrationCode: 1 }` (matrícula global)
- Adicionar: índice único `{ classroomId: 1, normalizedFullName: 1 }`
- Colisão de matrícula → **409** (mensagem atual)
- Colisão de nome na turma → **409** (nova mensagem, ex.: `Ja existe aluno com este nome na turma informada.`)

### 5.2 Backend — leitura (GET)

| # | Requisito |
| --- | --- |
| B7 | `GET /api/students`: incluir `normalizedFullName` em cada item (obrigatório no JSON) |
| B8 | Manter `fullName` na resposta para pré-preencher formulário de edição |
| B9 | OpenAPI: criar/atualizar schema `Student` com `fullName` + `normalizedFullName` em `required` |
| B10 | Busca `fullNameContains`: normalizar query e filtrar por `normalizedFullName` (regex escapado) |
| B11 | Ordenação da listagem: `normalizedFullName` asc |

**Opcional (fora do MVP):** `GET /api/students/:id` para edição direta por ID — se não implementado, documentar que a listagem já traz ambos os campos.

### 5.3 Frontend — exibição (leitura)

| # | Requisito |
| --- | --- |
| F1 | Schema Zod / tipo `Student`: `normalizedFullName: z.string()` obrigatório em respostas GET |
| F2 | Helper `studentDisplayName(student)` → `normalizedFullName` (espelhar `schoolDisplayName`) |
| F3 | Telas/componentes impactados (revisar todas as referências a `fullName` em **leitura**): |

- `StudentsPage` — tabela, diálogo excluir, `aria-label`
- `StudentDialogs` — modal Ver (label de leitura)
- `BulkScanUpload` — quando label vem de objeto `Student` da API (não alterar snapshot histórico)

| # | Requisito |
| --- | --- |
| F4 | Testes de UI: listagem renderiza `normalizedFullName` quando mock de GET traz ambos os campos |

### 5.4 Frontend — cadastro/edição (escrita)

| # | Requisito |
| --- | --- |
| F5 | Formulário e importação enviam apenas `fullName` no POST (comportamento atual) |
| F6 | Ao abrir edição, pré-preencher input com `fullName` |
| F7 | Após salvar, listagem via GET → usuário vê `normalizedFullName` |
| F8 | Tratar **409** de matrícula **e** de nome duplicado na turma com feedback distinto |

### 5.5 Migração, contrato e testes

| # | Requisito |
| --- | --- |
| M1 | Backfill de `normalizedFullName` para todos os documentos existentes |
| M2 | Relatório de colisões `(classroomId, normalizedFullName)` com `count > 1` — resolução manual antes do índice único |
| M3 | Ledger `app_migrations`: `student-normalized-full-name-v1` (mesmo padrão QODE-40) |
| M4 | Startup: executar migração só se ledger ausente; CLI `npm run migrate:students` + `--force` |
| M5 | Script de rollback documentado |
| M6 | Contrato OpenAPI + integração + testes do helper |
| M7 | Testes unitários do helper (exemplos §2.2 + letras espaçadas) |
| M8 | Testes de schema: rejeitar `normalizedFullName` no body |

---

## 6. API — contrato

### 6.1 Request (`StudentRequest`)

Sem alteração de campos aceitos:

```json
{
  "schoolId": "507f1f77bcf86cd799439011",
  "classroomId": "507f1f77bcf86cd799439012",
  "fullName": "Ana Clara Sousa",
  "registrationCode": "ALU-0001"
}
```

`normalizedFullName` → **400** (schema strict).

### 6.2 Response (`Student`)

```json
{
  "_id": "…",
  "schoolId": "…",
  "classroomId": "…",
  "fullName": "Ana Clara Sousa",
  "normalizedFullName": "ANA CLARA SOUSA",
  "registrationCode": "ALU-0001",
  "createdAt": "…",
  "updatedAt": "…"
}
```

OpenAPI `Student.required`: `["_id", "schoolId", "classroomId", "fullName", "normalizedFullName", "registrationCode"]`

### 6.3 Erros

| Código | Condição |
| --- | --- |
| 400 | Payload inválido; `normalizedFullName` no body; turma não pertence à escola |
| 403 | Escola/turma/aluno fora do escopo do perfil |
| 404 | Turma não encontrada |
| 409 | `registrationCode` duplicado **ou** `{ classroomId, normalizedFullName }` duplicado |

---

## 7. Migração de dados

### 7.1 Fluxo

```mermaid
flowchart TD
  A[Ledger student-normalized-full-name-v1 aplicada?] -->|Sim| Z[Pular migração]
  A -->|Não| B[Para cada Student: normalizedFullName = normalizeStudentFullName(fullName)]
  B --> C{Agrupar por classroomId + normalizedFullName}
  C -->|Colisões| D[Relatório JSON/console — exit 2]
  C -->|Sem colisões| E[Criar índice único classroomId + normalizedFullName]
  E --> F[Registrar app_migrations]
  D --> G[Resolução manual offline]
  G --> B
```

### 7.2 Script e ledger

**Arquivos sugeridos:**

- `backend/src/lib/migrations/migrate-student-normalized-full-name.ts`
- `backend/src/scripts/migrate-student-normalized-full-name.ts`
- `backend/src/scripts/rollback-student-normalized-full-name.ts`

**Ledger:** `{ name: "student-normalized-full-name-v1", appliedAt }` em `app_migrations`.

Comportamento (alinhado a QODE-40):

1. Consultar ledger; se aplicada → skip (sem scan).
2. Backfill por cursor; atualizar só onde valor difere.
3. Listar colisões por turma + nome normalizado.
4. Criar índice único; registrar ledger.
5. `--force` na CLI para reprocessar (dev/ops).
6. Evolução do algoritmo → `student-normalized-full-name-v2` (nova entrada no ledger).

### 7.3 Rollback

- `$unset` de `normalizedFullName` em todos os documentos;
- drop índice `classroomId_1_normalizedFullName_1`;
- remover entrada `student-normalized-full-name-v1` do ledger (opcional, manual).

---

## 8. Arquivos impactados (checklist de implementação)

### Backend

| Arquivo | Ação |
| --- | --- |
| `src/lib/normalize-person-name.ts` ou `normalize-student-full-name.ts` | Helper (reutilizar lógica QODE-40) |
| `src/modules/students/student.model.ts` | Campo + índice |
| `src/modules/students/students.routes.ts` | Derivar nome; 409; busca; sort |
| `src/modules/students/students.schemas.ts` | `.strict()` |
| `src/modules/students/students-list-scope.ts` | Busca em `normalizedFullName` |
| `src/docs/openapi.ts` | Schema `Student` |
| `src/lib/migrations/migrate-student-normalized-full-name.ts` | Migração + ledger |
| `src/server.ts` | Registrar migração no startup (ou só CLI em produção) |
| `tests/unit/normalize-student-full-name.test.ts` | **Criar** |
| `tests/unit/students.schemas.test.ts` | Rejeitar `normalizedFullName` |
| `tests/integration/students.integration.test.ts` | GET, 409 nome/matrícula, PATCH |
| `tests/contract/students-openapi.contract.test.ts` | Contrato `Student` |

### Frontend

| Arquivo | Ação |
| --- | --- |
| `web/src/api/students.ts` | Tipo + parse Zod com `normalizedFullName` |
| `web/src/pages/StudentsPage.tsx` | `studentDisplayName` na UI |
| `web/src/pages/students/StudentDialogs.tsx` | Ver: normalized; Editar: input `fullName` |
| `web/src/components/BulkScanUpload.tsx` | Label de aluno da API |
| Testes (`StudentsPage.test.tsx` se existir) | Assert em `normalizedFullName` |

---

## 9. Critérios de aceite

- [ ] GET de alunos sempre retorna `normalizedFullName`
- [ ] Front não usa `fullName` para exibir aluno em telas alimentadas por GET (somente `normalizedFullName`)
- [ ] Cadastro/edição/importação usam `fullName` no body; após persistir, GET reflete `normalizedFullName` correto
- [ ] Duplicata de matrícula → **409**; duplicata de nome na mesma turma → **409**
- [ ] Migração registrada em `app_migrations`; restarts subsequentes não reescaneiam a coleção
- [ ] Testes backend + front (exibição) verdes na CI

---

## 10. Cenários de QA (manual)

| # | Cenário | Resultado esperado |
| --- | --- | --- |
| 1 | POST `fullName`: `Ana Clara Sousa` → GET listagem | Coluna nome: `ANA CLARA SOUSA` |
| 2 | Abrir editar aluno | Input com `fullName` (`Ana Clara Sousa`); listagem com `normalizedFullName` |
| 3 | POST mesmo `registrationCode` | **409** matrícula |
| 4 | POST mesmo nome normalizado na mesma turma (matrícula diferente) | **409** nome na turma |
| 5 | PATCH só `registrationCode` | `normalizedFullName` inalterado na listagem |
| 6 | PATCH `fullName` | Listagem atualiza `normalizedFullName` |
| 7 | Importar planilha com acentos | Listagem exibe forma normalizada |

---

## 11. Fora de escopo

- Normalização de **turma** (QODE-42)
- Alterar `studentSnapshot` em cartões-resposta/resultados **já emitidos**
- Normalizar `registrationCode` (mantém regra atual de trim/min length; sem forma canônica)
- `GET /api/students/:id` (opcional; não bloqueia entrega se listagem já retornar ambos os campos)

---

## 12. Referências no repositório

- Modelo: `backend/src/modules/students/student.model.ts`
- Rotas: `backend/src/modules/students/students.routes.ts`
- Schemas: `backend/src/modules/students/students.schemas.ts`
- Listagem/escopo: `backend/src/modules/students/students-list-scope.ts`
- OpenAPI: `backend/src/docs/openapi.ts` (`StudentRequest`)
- Frontend: `web/src/api/students.ts`, `web/src/pages/StudentsPage.tsx`
- Normalização escola (reuso): `backend/src/lib/normalize-school-name.ts`
- Ledger: `backend/src/lib/migrations/migration-ledger.ts`
