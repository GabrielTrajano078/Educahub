# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar neste repositório.

**IMPORTANTE:** Mensagens de commit devem estar em **português**, usando **Conventional Commits** (`feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`, etc.).

**IMPORTANTE:** Nunca commitar diretamente em `main`. Sempre usar branches de feature (`feat/`, `feature/`, `fix/`, etc.) e abrir PR.

## Regras de desenvolvimento

Antes de considerar qualquer código pronto, é **obrigatório** demonstrar que funciona: criar ou atualizar testes (unitários, integração, contrato OpenAPI, web com Vitest) e executá-los com sucesso.

- **Backend:** Jest em `backend/tests/` (`unit`, `integration`, `contract`).
- **Web:** Vitest + Testing Library em `web/src/**/*.test.ts(x)`.
- **E2E:** Playwright via `e2e/` (ver [e2e/README.md](e2e/README.md)); CI roda na pipeline [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

Preferência do time: **TDD** quando implementar comportamento novo — teste primeiro, depois implementação mínima, depois refatoração segura.

## Comandos no shell

**IMPORTANTE:** Cada comando deve ser uma chamada Bash separada. Comandos compostos (`&&`, `;`, `||`) disparam prompts de permissão mesmo quando os comandos isolados já estão aprovados.

- **Errado:** `cd backend && npm test`
- **Certo:** `cd backend` em uma chamada; `npm test` em outra
- Comandos **independentes** (ex.: `npm test` no backend e `npm test` no web) → executar em **paralelo**
- Comandos **dependentes** (ex.: `npm run build` depois `npm run start`) → sequência de chamadas separadas

**Exceção — pipes para controlar saída:** `tail`, `head` ou `grep` são permitidos para encurtar logs (ex.: `npm test 2>&1 | tail -40`).

### Atalhos por pacote

| Onde | Comando | Descrição |
|------|---------|-----------|
| `backend/` | `npm run dev` | API `:3001` |
| `backend/` | `npm test` | Unit + integração + contrato |
| `backend/` | `npm run test:unit` / `test:integration` / `test:contract` | Suítes isoladas |
| `backend/` | `npm run check` | `tsc --noEmit` |
| `backend/` | `npm run setup` | Docker Mongo + seed |
| `web/` | `npm run dev` | Vite `:5173` |
| `web/` | `npm test` | Vitest |
| `web/` | `npm run lint` | ESLint |
| `web/` | `npm run build` | Typecheck + build |

Variáveis: `backend/.env` (`PORT`, `DATABASE_URL`, `JWT_SECRET`); `web/.env` (`VITE_API_BASE_URL` vazio em dev usa proxy para a API).

## Orquestração de workflow

### 1. Modo plano por padrão
- Entrar em modo plano para tarefas não triviais (3+ passos ou decisões de arquitetura)
- Se algo sair do trilho, **parar e replanejar** — não empurrar no escuro
- Usar plano também para verificação, não só para implementação

### 2. Subagentes
- Usar subagentes para pesquisa, exploração do codebase e análises paralelas
- Um foco por subagente; manter o contexto principal limpo

### 3. Loop de auto-melhoria
- Após correção do usuário, registrar o padrão em arquivo de lições (criar se não existir):
  - Global: `.claude/lessons.md`
  - Backend: `backend/.claude/lessons.md`
  - Web: `web/.claude/lessons.md`
- No início da sessão: ler `.claude/lessons.md` + o arquivo do escopo em que vai trabalhar

### 4. Verificação antes de concluir
- Nunca marcar tarefa como feita sem prova (testes, lint, comportamento observável)
- Perguntar: “Um staff engineer aprovaria este diff?”
- Para mudanças com spec em `.specs/features/`, alinhar implementação e critérios da spec/tasks

### 5. Elegância (com equilíbrio)
- Em mudanças não triviais, pausar e buscar solução simples e alinhada ao código existente
- Evitar over-engineering em correções óbvias

### 6. Correção autônoma de bugs
- Com relatório de bug ou CI falhando: investigar, corrigir e rodar testes relevantes sem pedir passo a passo

## Gestão de tarefas

1. Para features com card Jira/spec, usar `.specs/features/<id-ou-nome>/tasks.md` (checklist rastreável)
2. Estado e decisões do projeto: [`.specs/project/STATE.md`](.specs/project/STATE.md)
3. Marcar itens concluídos conforme avança; atualizar lições após correções do usuário

Branches típicas: `feat/qode-NN-descricao` ou `feature/QODE-NN-descricao` (espelhar o card **QODE** no Jira).

## Princípios

- **Simplicidade primeiro:** diff mínimo que resolve o problema
- **Causa raiz:** evitar gambiarras temporárias
- **Impacto mínimo:** não alterar arquivos fora do escopo pedido

## Documentação

| Recurso | Caminho |
|---------|---------|
| README (setup, demo, testes) | [README.md](README.md) |
| PRD de produto | [backend/docs/prd/prd.md](backend/docs/prd/prd.md) |
| Visão / metas / escopo | [.specs/project/PROJECT.md](.specs/project/PROJECT.md) |
| Roadmap | [.specs/project/ROADMAP.md](.specs/project/ROADMAP.md) |
| Design técnico | [.specs/design/DESIGN.md](.specs/design/DESIGN.md) |
| Arquitetura da API | [.specs/codebase/ARCHITECTURE.md](.specs/codebase/ARCHITECTURE.md) |
| Spec da plataforma | [.specs/features/plataforma-avaliacao/spec.md](.specs/features/plataforma-avaliacao/spec.md) |
| Débito técnico / Jira | [docs/technical-debt-jira-tasks.md](docs/technical-debt-jira-tasks.md) |
| Integração Jira MCP | [docs/jira-mcp-integration.md](docs/jira-mcp-integration.md) |
| Regra Cursor Jira (QODE) | [.cursor/rules/jira-config.mdc](.cursor/rules/jira-config.mdc) |

Specs pontuais de feature também podem existir em `backend/specs/` (ex.: planos de migração próximos ao código).

## Visão do projeto

**SAEB / SPA-S — Plataforma de Diagnóstico Educacional:** monorepo full stack para criar provas, corrigir cartões-resposta (OMR), analisar desempenho por habilidade SAEB/SPA-S e apoiar gestão escolar (professor → secretaria municipal).

**Stack real do repositório (não assumir outra):**

| Camada | Tecnologias |
|--------|-------------|
| **API** | Node.js 20+, TypeScript, Express 5, Mongoose, Zod, JWT, Swagger UI |
| **Web** | React 19, Vite 7, TanStack Query, React Router, Zod |
| **Dados** | MongoDB (Docker Compose no dev) |
| **Qualidade** | Jest (API), Vitest + Testing Library (web), contrato OpenAPI, Playwright (E2E) |

> Nota: regras de workspace podem mencionar Go para backend; o código atual é **TypeScript/Express**. Decisões de stack futura ficam em [`.specs/project/STATE.md`](.specs/project/STATE.md).

**Papéis (RBAC):** `admin`, `gestor`, `coordenador`, `professor` — escopo por município, escola e turmas (`classroomIds`).

**Demo local (seed):** senha `Admin123` — `admin@saeb.local`, `gestor@saeb.local`, `professor@saeb.local`.

## Estrutura do repositório

```
├── backend/              # API Express + MongoDB + OMR/PDF
│   ├── src/
│   │   ├── modules/      # auth, schools, classes, students, questions, exams, results
│   │   ├── lib/          # access, migrations, file-storage, etc.
│   │   ├── middlewares/
│   │   └── docs/openapi.ts
│   ├── tests/            # unit, integration, contract
│   ├── specs/            # specs de feature próximas ao backend
│   └── docs/prd/
├── web/                  # SPA React (Vite) — proxy dev → :3001
│   └── src/
│       ├── api/          # clientes HTTP
│       ├── pages/
│       ├── components/
│       └── schemas/      # Zod (espelha validações da API quando aplicável)
├── e2e/                  # run_e2e.py + Playwright + compose Mongo :27018
├── docs/                 # débito técnico, integrações
└── .specs/               # specs vivas, roadmap, estado do projeto
```

**Hierarquia de domínio:** Município → Escola → Turma → Aluno → Provas → Cartões-resposta → Resultados / Diagnóstico.

## Convenções de código

### Backend (`backend/`)

- Módulos em `src/modules/<domínio>/`: `*.routes.ts`, `*.model.ts`, `*.schemas.ts` (Zod).
- Autorização: `requireAuth` + `requireRole` em [`src/middlewares/auth.ts`](backend/src/middlewares/auth.ts); escopo em [`src/lib/access.ts`](backend/src/lib/access.ts) (`canAccessSchool`, `canAccessClassroom`, `canAccessStudent`).
- Erros Zod → **400** `{ message, issues }`; demais → **500** genérico (ver `src/app.ts`).
- OpenAPI é fonte de contrato: [`src/docs/openapi.ts`](backend/src/docs/openapi.ts); manter rotas e spec alinhadas; testes em `backend/tests/contract/`.
- Migrações/scripts one-off: `src/scripts/` e ledger em `src/lib/migrations/` quando aplicável.

### Web (`web/`)

- Rotas e páginas em `src/pages/`; chamadas API em `src/api/`.
- Validação de formulários com Zod em `src/schemas/`.
- Testes de página: helper [`src/test/render-page.tsx`](web/src/test/render-page.tsx) (QueryClient + Router + `ConfirmProvider`).
- Skills do Cursor em `.cursor/skills/` (React composition, best practices) aplicam-se ao frontend.

### Testes

```bash
# Backend (na pasta backend)
npm test

# Web (na pasta web)
npm test
npm run lint
```

E2E local: [e2e/README.md](e2e/README.md). CI exige **CI merge gate** (backend + web + e2e).

## Spec-driven / Jira

- **Jira (Scorefy):** projeto **`QODE`** — `cloudId` e metadados em [`.cursor/rules/jira-config.mdc`](.cursor/rules/jira-config.mdc); MCP Atlassian em [docs/jira-mcp-integration.md](docs/jira-mcp-integration.md). Em JQL: `project = QODE`.
- **Repositório:** specs vivas em `.specs/` (não há `docs/constitution/` neste repo).
- Fluxo típico de change:
  1. Card **QODE-** no Jira
  2. Branch `feat/qode-NN-...` ou `feature/QODE-NN-...`
  3. Pasta `.specs/features/<nome>/` com `spec.md`, `design.md` (se necessário), `tasks.md`
  4. Specs de implementação próximas ao domínio em `backend/specs/` quando fizer sentido
  5. PR para `main` com código + atualização de spec quando o comportamento mudar

Rastreabilidade: requisitos `REQ-*` no PRD/spec; estado e decisões em [`.specs/project/STATE.md`](.specs/project/STATE.md).

## Git worktrees (opcional)

Não há comando `/start-change` neste repo; se usar worktrees:

- Preferir `.worktrees/<nome-change>/` (adicionar ao `.gitignore` se a equipa adotar)
- Uma sessão Claude Code por worktree

## Cursor / agentes

- Regras Jira: `.cursor/rules/jira-config.mdc`
- Skills React: `.cursor/skills/react-composition-patterns/`, `.cursor/skills/react-best-practices/`
- Não commitar tokens; OAuth MCP Atlassian conforme [docs/jira-mcp-integration.md](docs/jira-mcp-integration.md)
