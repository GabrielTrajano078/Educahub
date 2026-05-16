# Débito técnico — rascunhos para tarefas no Jira

Cada bloco contém um **Título** (Summary) e **Descrição** (Description) para criar issues no Jira. Ordem sugerida: Backend → Frontend → E2E.

---

## Backend

### Título
Tratamento global de erros HTTP na API Express

### Descrição
O middleware de erro em `app.ts` só trata `ZodError`. Erros lançados com `Object.assign(new Error(...), { statusCode })` chegam via `next(error)` e são respondidos como **500** em vez do código correto (ex.: 404, 400).

**Objetivos**
- Reconhecer erros com `statusCode` no handler global **ou** introduzir tipo/classe (`HttpError`) e usá-la de forma consistente.
- Reduzir `catch` locais duplicados que apenas mapeiam `statusCode` para `res.status`.

**Critérios de aceite**
- Erros com `statusCode` definido devolvem esse código HTTP e corpo JSON alinhado ao restante da API (ex.: `{ message }` onde já for o padrão).
- Regressão: validação Zod continua a devolver 400 com `issues`.

---

### Título
Auditoria de rotas que devolvem 500 por falha no `next(error)` com `statusCode`

### Descrição
Alguns handlers fazem `catch (error) { next(error); }` após chamar helpers que lançam erros com `statusCode` (ex.: `buildOfficialAnswerKeyItems` em `exams.routes.ts` com 404).

**Objetivos**
- Listar todas as chamadas a `next(error)` após `throw`/helpers que attacham `statusCode`.
- Corrigir após ou em conjunto com o handler global de erros HTTP.

**Critérios de aceite**
- Casos identificados em testes (integração ou contrato) devolvem o status esperado (4xx) e não 500.

---

### Título
Extrair e tipar `getBaseUrl` (rotas exams e results)

### Descrição
A função `getBaseUrl` está duplicada em `exams.routes.ts` e `results.routes.ts` com parâmetro `req: any`.

**Objetivos**
- Helper único (ex.: `lib/request-base-url.ts`) tipado com `Request` do Express.
- Substituir as duas cópias locais.

**Critérios de aceite**
- Comportamento mantido (`protocol` + `host`).
- Sem `any` neste helper.

---

### Título
Refinar `omr.service.ts`: Jimp e tipagem de imagem

### Descrição
`omr.service.ts` usa `require("jimp")` junto com `import` e vários parâmetros `image: any`.

**Objetivos**
- Alinhar forma de carregar Jimp (ESM/CJS compatível com o bundler/compilador do backend).
- Tipar imagens com tipo do Jimp ou interface mínima com os métodos usados.

**Critérios de aceite**
- Build e testes existentes passam; comportamento OMR inalterado salvo correções de tipo.

---

### Título
Adicionar ESLint ao backend Node/TypeScript

### Descrição
O pacote `web` tem `eslint` e script `lint`; o `backend` não tem lint automatizado no `package.json`.

**Objetivos**
- Configurar ESLint + TypeScript para `backend/`.
- Script `npm run lint` no backend.

**Critérios de aceite**
- `npm run lint` no diretório `backend` executa sem erro no código atual ou com lista explícita de exceções documentadas (`eslint-disable` mínimos).

---

### Título
Rever script de desenvolvimento do backend (`transpile-only`)

### Descrição
`npm run dev` usa `ts-node-dev --transpile-only`, o que omite verificação de tipos durante o ciclo rápido de dev.

**Objetivos**
- Avaliar alternativa (ex.: `tsx`/watch + `tsc --noEmit` em paralelo, ou pré-commit `check`).
- Documentar o fluxo recomendado para a equipa.

**Critérios de aceite**
- Decisão documentada em README ou guia interno e um comando único ou script que reduza regressões de tipo em dev.

---

### Título
Ampliar testes de contrato OpenAPI no backend

### Descrição
Existem testes de contrato para schools, classes e students. Faltam módulos públicos equivalences para exams, results, questions e auth (conforme exposto na API).

**Objetivos**
- Adicionar ficheiros de contrato no padrão de `tests/contract/*-openapi.contract.test.ts` para rotas prioritárias.

**Critérios de aceite**
- Contrato cobre endpoints críticos acordados com o produto; CI executa os novos testes.

---

### Título
Transações MongoDB em operações multi-documento críticas

### Descrição
Operações como exclusão em cascata de prova usam vários `deleteMany`/`updateMany` em sequência sem transação — risco de estado inconsistente se uma etapa falhar.

**Objetivos**
- Identificar escritas relacionadas que devem ser atómicas.
- Usar sessões/transações MongoDB onde o deployment suportar (replica set / tolerância definida).

**Critérios de aceite**
- Pelo menos o fluxo de maior risco coberto por transação ou documentado como aceite de risco com mitigação.

---

## Frontend (`web`)

### Título
Rever dependência `xlsx` e risco de segurança

### Descrição
A biblioteca `xlsx` no `web/package.json` é frequentemente apontada em auditorias.

**Objetivos**
- Correr auditoria (`npm audit` ou ferramenta interna).
- Decisão: atualizar versão aceitável, mitigar (uso restrito/isolado) ou migrar substituto.

**Critérios de aceite**
- Documento ou comentário de decisão; pipeline ou processo para rever alertas periodicamente.

---

### Título
Aumentar cobertura de testes nos fluxos de maior risco (web)

### Descrição
Muitas páginas e fluxos (ex.: exames, resultados, importações intensivas) não têm testes automatizados alinhados à criticidade para regressão.

**Objetivos**
- Priorizar 2–3 fluxos pela equipa de produto/desenvolvimento.
- Testes Vitest + Testing Library onde já existir padrão.

**Critérios de aceite**
- Novos testes estáveis na CI existente do `web`; escopo definido por issue-filhos se necessário.

---

### Título (opcional)
Refatorar `ConfirmDialog` para remover `eslint-disable` do react-refresh

### Descrição
Em `ConfirmDialog.tsx` existe `eslint-disable react-refresh/only-export-components` devido ao hook acoplado ao provider no mesmo módulo.

**Objetivos**
- Separar hook/provider/componente segundo convenção ESLint OU ajustar exportações sem weaken global do plugin.

**Critérios de aceite**
- Lint passa sem o disable OU justificativa documentada aceite pela equipa.

---

## E2E (Playwright)

### Título
Documentação e bootstrap da stack para testes E2E (API + web)

### Descrição
O Playwright sobe apenas o Vite (`web`). O `global-setup` chama `/health` no `baseURL` (proxy para API em `:3001`); sem backend ativo ou com `E2E_SKIP_API_SMOKE`, o comportamento varia — fricção local/CI.

**Objetivos**
- README em `e2e/playwright` ou doc raiz: passos para rodar E2E “full stack”.
- Opcional: script/Makefile que suba API + web antes dos testes.

**Critérios de aceite**
- Novo membro reproduz E2E com sucesso seguindo apenas a doc; variáveis de ambiente (`E2E_SKIP_API_SMOKE`, `E2E_BASE_URL`) listadas.

---

### Título
E2E: fluxos autenticados (além do login e mocks)

### Descrição
Hoje há smoke no login/signup e validações com intercept/mocks na API em alguns testes — faltam jornadas autenticadas na aplicação real.

**Objetivos**
- Definir 1–2 fluxos críticos (login real + página/proação acordados).
- Implementar especificações Playwright reutilizando storageState ou fixture onde fizer sentido.

**Critérios de aceite**
- Pelo menos um fluxo estável sem flakyness documentado nos critérios de retry.

---

### Título (opcional)
Expandir matriz de browsers no Playwright (CI)

### Descrição
Apenas Chromium está configurado em `playwright.config.ts`.

**Objetivos**
- Se for requisito de qualidade: adicionar projetos Firefox e/ou WebKit em CI ou job agendado.

**Critérios de aceite**
- CI configurada com timeouts e paralelização adequados; falhas documentadas.

---

### Título
Manutenção da versão do Playwright e browsers

### Descrição
Garantir alinhamento entre `@playwright/test` no `e2e/playwright/package.json` e instalação de browsers no CI (`npx playwright install`).

**Objetivos**
- Documentar versão mínima e comando de instalação em CI.

**Critérios de aceite**
- Pipeline CI instala browsers corretamente em cada build que corre E2E.

---

## Nota de alinhamento de stack (producto / arquitetura)

### Título
Documentar decisão de stack do backend (TypeScript vs Go)

### Descrição
O repositório usa backend Node/Express/TypeScript; guidelines internas referem Go para backend.

**Objetivos**
- ADR ou página de arquitetura: stack atual, razões e se há roadmap de migração ou exceção formal.

**Critérios de aceite**
- Equipa e novos contratados têm fonte única de verdade documentada.
