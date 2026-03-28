# Arquitetura do backend (resumo)

Este repositório expõe uma **API HTTP com Express** em TypeScript. O ponto de entrada das rotas e da documentação está em `src/app.ts`: prefixos `/api/*` para os recursos, **`/docs` para Swagger UI** (OpenAPI em `src/docs/openapi.ts`), `/health` e `/openapi.json`.

## Organização em `src/modules/*`

Cada domínio costuma reunir **rotas**, **modelos Mongoose** e **schemas Zod** de validação.

- **`auth`** — `auth.routes.ts`: bootstrap opcional do primeiro admin (`POST /api/auth/bootstrap-admin`), login com bcrypt e emissão de JWT (`POST /api/auth/login`), e rotas que exigem usuário autenticado. `users.routes.ts` complementa gestão de usuários sob o mesmo prefixo `/api/auth`. `user.model.ts` persiste papel, escola, município e `classroomIds` dos professores.
- **`schools`** — CRUD/listagem de escolas com vínculo a `municipalityCode`; acesso restrito a **admin** e **gestor** (gestor vê apenas o próprio município).
- **`classes`** — Turmas (`classroom.model`): listagem filtrada por papel (professor só vê turmas em `classroomIds`; coordenador pela escola); criação com checagem de escola via `canAccessSchool`.
- **`students`** — Alunos: listagem com o mesmo padrão de escopo que turmas; criação valida escola e, para professor, turma atribuída.
- **`questions`** — Banco de questões (modelo e rotas para administração/consulta conforme evolução do produto).
- **`exams`** — Provas: vínculo a escola e turma; reutiliza `canAccessSchool` / `canAccessClassroom` / `canAccessStudent` para operações que tocam escola, turma ou aluno; integra arquivos, gabarito oficial e utilitários (ex. blueprint de simulado).
- **`results`** — Cartões-resposta, scans, OCR (OMR), agregações pedagógicas e relatórios por aluno, turma, escola e município; autorização alinhada ao escopo do usuário em cada endpoint.

Há código compartilhado fora de `modules`: `src/lib/access.ts` (regras de escopo), `src/lib/file-storage.ts`, `src/middlewares/auth.ts`, `src/config/env.ts`, etc.

Em `src/app.ts`, erros de validação **Zod** são convertidos em resposta **400** com corpo `{ message, issues }`; demais erros não tratados retornam **500** genérico. Uploads estáticos ficam servidos em `/uploads` a partir do diretório configurado em `getUploadRoot()`.

## Middleware de autenticação (`src/middlewares/auth.ts`)

1. **`requireAuth`** — Lê `Authorization: Bearer <jwt>`. Sem header ou sem prefixo correto → **401** (`Token nao informado.`). Verifica assinatura com `JWT_SECRET`; payload deve conter `role` em `admin` | `professor` | `coordenador` | `gestor`; caso contrário **401** (`Token invalido.`). Em sucesso, preenche `req.user` com `id`, `role`, `schoolId`, `municipalityCode` e `classroomIds` (array normalizado a string). Erros de verificação/expiração → **401** (`Token invalido ou expirado.`).
2. **`requireRole(...allowedRoles)`** — Exige `req.user` já definido; se o papel não estiver na lista → **403** (`Acesso negado para este perfil.`).

O login em `auth.routes.ts` inclui no token os mesmos campos de escopo persistidos no usuário, para que cada requisição autenticada carregue o contexto organizacional.

## Fluxo de escopo: escola → turma → aluno (`src/lib/access.ts`)

As funções são **assíncronas** e consultam o MongoDB quando necessário para cruzar IDs com documentos reais.

- **`canAccessSchool(user, schoolId)`**  
  - **admin:** sempre permitido.  
  - **gestor:** permitido se a escola existir e tiver o mesmo `municipalityCode` do usuário (gestor sem código → negado).  
  - **professor** e **coordenador:** permitido se `user.schoolId === schoolId`.  
  - Outros papéis: negado.

- **`canAccessClassroom(user, classroomId)`**  
  - Carrega a turma, obtém `schoolId` e exige `canAccessSchool` primeiro.  
  - **professor:** além disso, `classroomId` deve estar em `user.classroomIds`.  
  - **coordenador** e **gestor:** após escola OK, acesso à turma segue (coordenador/gestor não são limitados à lista de turmas do professor).

- **`canAccessStudent(user, studentId)`**  
  - Carrega o aluno (`schoolId`, `classroomId`), valida escola com `canAccessSchool`.  
  - **professor:** exige que `classroomId` do aluno esteja em `user.classroomIds`.  
  - **coordenador** e **gestor:** escola válida basta.

Esse trio é usado nas rotas de turmas, alunos, provas e resultados, às vezes combinado com **filtros na query** (ex.: professor só enxerga linhas das próprias turmas no `GET` em lista) para evitar vazamento de dados mesmo quando a rota não recebe um ID explícito.

## Diagrama textual do fluxo de uma requisição

```
Cliente
  → Authorization: Bearer JWT
  → requireAuth (valida JWT, monta req.user)
  → requireRole? (opcional, por rota)
  → Handler da rota (Zod nos query/body/params)
  → canAccessSchool / canAccessClassroom / canAccessStudent (conforme recurso)
  → Mongoose (models em src/modules/.../*.model.ts)
  → JSON de resposta
```

## Papéis e intenção de negócio (resumo)

| Papel        | Escopo típico |
|-------------|----------------|
| admin       | Global (bypass nas funções de access). |
| professor   | Escola fixa + apenas turmas em `classroomIds`. |
| coordenador | Toda a escola (`schoolId`). |
| gestor      | Todas as escolas do município (`municipalityCode`). |

O módulo **`questions`** concentra o modelo de item de prova e as rotas de manutenção e consulta; **`exams`** e **`results`** dependem dele para montar provas, gabaritos e correções. Assim, a cadeia pedagógica na API segue: escola/turma/aluno (organizacional) → questões → prova → resultado/cartão.

Esta visão deve ser lida junto do PRD (`docs/prd/prd.md`) e da especificação da feature em `.specs/features/plataforma-avaliacao/spec.md` para rastrear requisitos de produto versus o que a API já implementa. Para checklist de QA da fundação (M1), ver `.specs/features/plataforma-avaliacao/qa-m1.md`.
