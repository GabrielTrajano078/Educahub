# Tarefas — Plataforma SAEB/SPA-S (M1: Fundação e identidade)

**Design:** Não aplicável neste marco; detalhes em `.specs/features/plataforma-avaliacao/spec.md` (P1 RBAC).  
**Milestone:** `.specs/project/ROADMAP.md` — M1  
**Status:** Concluído (T1–T11)

---

## Plano de execução

### Fase 1 — Modelo e token (sequencial)

```
T1 → T2 → T3
```

### Fase 2 — Autorização (após Fase 1)

```
T4 → T5
```

### Fase 3 — Gestão admin, seed e OpenAPI (após T5)

```
T6 → T8        (T8 depende de T6)
T7 [P]         (T7 só depende de T1; pode ir em paralelo a T6 após T1)
```

Recomendação: após T5, executar **T6**; em paralelo **T7** (se ainda não feito); depois **T8**; em seguida Fase 4.

### Fase 4 — QA e baseline (sequencial)

```
T9 → T10 → T11
```

---

## Mapa de paralelismo

| Fase | Paralelo? | Tarefas |
|------|-----------|---------|
| 1 | Não | T1 → T2 → T3 |
| 2 | Não | T4 → T5 |
| 3 | Parcial | T6 → T8; T7 [P] junto com T6 após T1 |
| 4 | Não | T9 → T10 → T11 |

---

## T1: Campo `classroomIds` no modelo de usuário

**O quê:** Persistir turmas vinculadas ao professor (`ObjectId[]`, default `[]`). Perfis não-professor ignoram ou mantêm vazio.

**Onde:** `src/modules/auth/user.model.ts`

**Depende de:** —

**Requisito:** REQ-AUTH-01

**Feito quando:**

- [x] Schema Mongoose inclui `classroomIds` (array de `ObjectId`, ref `Classroom`, default `[]`).
- [x] Índice multikey se necessário para consultas por turma.
- [x] `npm run check` sem erros.

**Verificar:** Inspecionar schema; usuários existentes migram com array vazio sem quebra.

**Commit sugerido:** `feat(auth): add classroomIds to user model`

---

## T2: Tipo `AuthUser` com `classroomIds`

**O quê:** JWT e `req.user` carregam lista de IDs de turma para o papel professor.

**Onde:** `src/types/auth.ts`, `src/types/express.d.ts` (se aplicável)

**Depende de:** T1

**Requisito:** REQ-AUTH-01

**Feito quando:**

- [x] `AuthUser` inclui `classroomIds: string[]` (ou `null` apenas se preferir explícito para legado).
- [x] Tipos alinhados ao payload do JWT.

**Verificar:** `npm run check`

**Commit sugerido:** `feat(auth): extend AuthUser with classroomIds`

---

## T3: Login, JWT e GET `/me` com `classroomIds`

**O quê:** Incluir `classroomIds` no `jwt.sign`, na resposta de login e em `/me`.

**Onde:** `src/modules/auth/auth.routes.ts`

**Depende de:** T2

**Requisito:** REQ-AUTH-01, REQ-AUTH-04

**Feito quando:**

- [x] Payload do token contém `classroomIds` (array serializável).
- [x] Resposta JSON de login e `/me` expõe `classroomIds` para o cliente.
- [x] Token inválido/expirado continua retornando 401 com mensagem genérica (sem stack).

**Verificar:** Login com usuário seed; decodificar JWT (ex.: jwt.io local) e conferir campo.

**Commit sugerido:** `feat(auth): include classroomIds in jwt and me endpoint`

---

## T4: `canAccessClassroom` restrito por turma para professor

**O quê:** Professor só acessa turma se `classroomId` estiver em `user.classroomIds` **e** a turma pertencer à escola do usuário.

**Onde:** `src/lib/access.ts`

**Depende de:** T3

**Requisito:** REQ-AUTH-01

**Feito quando:**

- [x] `role === "professor"` exige inclusão em `classroomIds` após validar escola.
- [x] `coordenador`, `gestor`, `admin` mantêm regras atuais (escola/município/admin).

**Verificar:** Chamada com professor sem turma → `false`; com turma listada → `true`.

**Commit sugerido:** `fix(access): scope professor to assigned classrooms`

---

## T5: `canAccessStudent` alinhado à turma do aluno (professor)

**O quê:** Professor só acessa aluno se `student.classroomId` ∈ `user.classroomIds` (e escola consistente).

**Onde:** `src/lib/access.ts`

**Depende de:** T4

**Requisito:** REQ-AUTH-01

**Feito quando:**

- [x] Professor não acessa aluno de turma não vinculada.
- [x] Demais papéis preservam comportamento atual.

**Verificar:** Par aluno/turma/professor no seed; chamadas diretas a `canAccessStudent`.

**Commit sugerido:** `fix(access): tie professor student access to classroomIds`

---

## T6: Rota admin para atribuir turmas ao professor [P]

**O quê:** Endpoint `PATCH` (ou `PUT`) protegido por `admin` para atualizar `classroomIds` de um usuário com `role: professor`.

**Onde:** novo arquivo, ex. `src/modules/auth/users.routes.ts`; registrar em `src/app.ts`

**Depende de:** T5

**Requisito:** REQ-AUTH-01

**Feito quando:**

- [x] Apenas `admin` altera `classroomIds`.
- [x] Validação: turmas existem e pertencem à mesma `schoolId` do professor.
- [x] Professor sem `schoolId` não recebe turmas (erro 400).

**Verificar:** `curl`/Thunder com token admin vs professor.

**Commit sugerido:** `feat(auth): admin endpoint to assign classrooms to professor`

---

## T7: Atualizar seed com `classroomIds` para professor de teste [P]

**O quê:** Usuário professor no `seed.ts` com ao menos uma turma da escola seed.

**Onde:** `src/scripts/seed.ts`

**Depende de:** T1

**Requisito:** REQ-AUTH-01

**Feito quando:**

- [x] Após seed, login professor tem `classroomIds` coerentes com `Classroom` criada.

**Verificar:** `npm run seed` (ou script existente) + login.

**Commit sugerido:** `chore(seed): bind professor to seeded classroom`

---

## T8: Cobertura OpenAPI para usuário e rota admin [P]

**O quê:** Documentar `classroomIds` em esquemas de usuário e novo endpoint em `openapi.ts`.

**Onde:** `src/docs/openapi.ts`

**Depende de:** T6

**Requisito:** REQ-AUTH-04 (contrato explícito para clientes)

**Feito quando:**

- [x] Swagger UI reflete campos e rota admin.

**Verificar:** Abrir `/api-docs` e inspecionar.

**Commit sugerido:** `docs(api): openapi for classroomIds and admin user patch`

---

## T9: Matriz manual de permissões (checklist QA)

**O quê:** Documento curto ou tabela em `.specs/project/STATE.md` com cenários: professor turma A ok / turma B negado; coordenador escola; gestor município; token inválido 401.

**Onde:** `.specs/project/STATE.md` (secção QA M1) ou `.specs/features/plataforma-avaliacao/qa-m1.md`

**Depende de:** T6, T7, T8

**Requisito:** REQ-AUTH-02, REQ-AUTH-03, REQ-AUTH-04

**Feito quando:**

- [x] Checklist com rotas críticas (`/classes`, `/students`, `/exams`, `/results`) e resultado esperado por papel.

**Verificar:** Revisão humana executando checklist uma vez.

**Commit sugerido:** `docs(specs): M1 RBAC QA checklist`

---

## T10: Baseline de arquitetura (brownfield)

**O quê:** Resumo dos módulos `src/modules/*`, middleware de auth, e fluxo de escopo escola/turma/aluno.

**Onde:** `.specs/codebase/ARCHITECTURE.md`

**Depende de:** T9

**Requisito:** Entregável PRD §10 (documento técnico — versão incremental)

**Feito quando:**

- [x] Diagrama textual ou lista de módulos + responsabilidades em &lt; ~800 palavras.

**Verificar:** Leitura por outro dev em &lt; 10 min.

**Commit sugerido:** `docs(specs): add architecture baseline for API`

---

## T11: Atualizar ROADMAP (status M1)

**O quê:** Quando T1–T10 concluídos e verificados, marcar features de M1 como **COMPLETE** ou **IN PROGRESS** conforme realidade.

**Onde:** `.specs/project/ROADMAP.md`

**Depende de:** T10

**Requisito:** —

**Feito quando:**

- [x] Status das features de M1 reflete o repositório.

**Commit sugerido:** `docs(specs): update M1 roadmap status`

---

## Checagem de granularidade

| Tarefa | Escopo | OK? |
|--------|--------|-----|
| T1 | 1 modelo | Sim |
| T2 | 1 arquivo de tipos | Sim |
| T3 | 1 roteador auth | Sim |
| T4–T5 | 1 arquivo access (2 funções — aceitável no mesmo arquivo na mesma PR se preferir partir T5 em commit separado) | Sim |
| T6 | 1 rota nova | Sim |
| T7 | seed | Sim |
| T8 | openapi | Sim |
| T9–T11 | docs | Sim |

---

## Próximo marco

Após M1 verificado: iniciar **M2 — Banco de questões** com novo `tasks-m2.md` ou secção adicional neste arquivo, conforme preferência do time.
