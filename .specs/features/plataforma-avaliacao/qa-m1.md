# QA manual — M1 (matriz de cenários)

Checklist curta para validar autenticação, RBAC e escopo nas rotas críticas da API Express (`src/app.ts`). Documentação interativa: **Swagger UI em `/docs`** (OpenAPI também em `/openapi.json`).

**Pré-requisitos:** usuários de teste com papéis distintos; professor com `classroomIds` contendo apenas a **turma A** (mesma escola que a turma B); coordenador e gestor com `schoolId` / `municipalityCode` coerentes com os dados seed.

| Cenário | Rotas / ação | Resultado esperado |
|--------|----------------|-------------------|
| **Professor — turma A OK** | `GET /api/classes` (sem filtrar fora do permitido) ou `GET /api/classes?...` alinhado às turmas atribuídas | `200` — lista contém a turma A (e apenas turmas em `classroomIds`). |
| **Professor — turma B negado** | `GET /api/students?classroomId=<id_turma_B>` | `200` com **lista vazia** `[]` (escopo filtrado; não vaza dados de outra turma). |
| **Professor — turma B negado (escrita)** | `POST /api/students` com `classroomId` da turma B | `403` — mensagem de acesso negado à turma (`canAccessClassroom`). |
| **Coordenador — escola** | `GET /api/classes`, `GET /api/students` | `200` — todos os registros da **mesma escola** (`schoolId` do token), sem restrição a uma única turma. |
| **Coordenador — criação turma** | `POST /api/classes` com `schoolId` da própria escola | `201` quando `canAccessSchool` OK. |
| **Gestor município — escolas** | `GET /api/schools` | `200` — apenas escolas com `municipalityCode` do gestor. |
| **Gestor município — turmas/alunos** | `GET /api/classes`, `GET /api/students` (com filtros válidos) | `200` — escopo amplo no município (sem limitação por `classroomIds`). |
| **Gestor — escola fora do município** | `POST /api/classes` com `schoolId` de escola de **outro** município | `403` — acesso negado à escola. |
| **Provas — professor turma A** | `GET /api/exams` e operações de leitura/escrita que referenciem prova da turma A | `200` / `201` conforme rota, quando escola + turma permitidos. |
| **Provas — professor turma B** | Operações que vinculem prova ou recurso à turma B (ex.: criação/listagem filtrada por turma não atribuída) | `403` ou lista vazia conforme implementação da rota (sempre sem expor dados da turma B). |
| **Resultados — escopo** | `GET` / mutações em `/api/results` para aluno/turma/prova dentro do escopo do papel | `200` / sucesso quando `canAccessSchool` / `canAccessClassroom` / `canAccessStudent` OK. |
| **Resultados — fora do escopo** | Idem para recurso de outra escola/turma/aluno | `403` ou `404` conforme rota (sem vazar existência indevida). |
| **Auth — login OK** | `POST /api/auth/login` com credenciais válidas | `200` com token JWT (`Bearer`). |
| **Auth — credenciais inválidas** | `POST /api/auth/login` email/senha errados | `401` — credenciais inválidas. |
| **Token inválido / ausente** | Qualquer rota protegida com `Authorization` ausente, malformado ou JWT inválido/expirado | `401` — mensagens do middleware (`Token nao informado.`, `Token invalido ou expirado.`, etc.). |
| **Papel não autorizado na rota** | Ex.: professor em rota com `requireRole` apenas admin/gestor/coordenador | `403` — acesso negado para o perfil. |

**Notas**

- Rotas montadas em: `/api/auth`, `/api/classes`, `/api/students`, `/api/exams`, `/api/results` (e demais prefixos em `src/app.ts`).
- Admin: tratado como bypass de escopo nas funções de `src/lib/access.ts` (útil para smoke test interno).
