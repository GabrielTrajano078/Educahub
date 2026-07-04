# E2E (Playwright)

Padrão alinhado ao blueprint `strategie-e2e.md`: orquestrador Python, Compose para Mongo, Playwright com `baseURL` por variável de ambiente.

## Pré-requisitos

- Docker e Docker Compose v2 (`docker compose`)
- Node 20+ e npm
- Python 3.10+

## Variáveis

Copie `e2e/.env.example` para `e2e/.env`. Valores já definidos no shell ou no CI **não** são sobrescritos pelo `.env` local.

| Variável | Descrição |
|----------|-----------|
| `E2E_BASE_URL` | URL da SPA (padrão `http://127.0.0.1:5173`) |
| `E2E_SKIP_API_SMOKE` | `1` pula o `GET /health` no global-setup (sem backend) |
| `E2E_SKIP_WEB_SERVER` | `1` não sobe o Vite pelo Playwright (você já rodou `npm run dev` em `web/`) |
| `E2E_ADMIN_EMAIL` | E-mail do admin E2E (bootstrap + login; padrão `e2e-admin@saeb.local`) |
| `E2E_ADMIN_PASSWORD` | Senha do admin E2E (padrão `Admin123456`) |

## Fluxo recomendado (full stack)

```bash
# 1) Mongo isolado (porta host 27018 por padrão)
python e2e/run_e2e.py up

# 2) Backend apontando para esse Mongo (porta 27018)
# Use DATABASE_URL (nome já utilizado pela API)
export DATABASE_URL="mongodb://127.0.0.1:27018/spas_saeb?directConnection=true"
cd backend && npm run dev

# 3) Em outro terminal: testes (sobe Vite automaticamente se nada estiver na URL)
python e2e/run_e2e.py test

# 4) Diagnóstico / logs
python e2e/run_e2e.py status
python e2e/run_e2e.py logs mongo --tail=80
python e2e/run_e2e.py diagnose

# 5) Encerrar stack Compose do e2e
python e2e/run_e2e.py down
```

### Sem backend (só UI)

```bash
E2E_SKIP_API_SMOKE=1 python e2e/run_e2e.py test --skip-install
```

### CI / um comando

```bash
CI=true python e2e/run_e2e.py all --teardown-on-success
```

Ajuste `DATABASE_URL` no backend para o host/porta do passo `up` antes de rodar a suíte completa com smoke de API.

## Bootstrap rápido (novo membro)

Do zero, em 3 terminais:

```bash
# terminal A
python e2e/run_e2e.py up

# terminal B
export DATABASE_URL="mongodb://127.0.0.1:27018/spas_saeb?directConnection=true"
cd backend && npm ci && npm run dev

# terminal C
cd e2e
python run_e2e.py test
```

Quando terminar:

```bash
python e2e/run_e2e.py down
```

## Solução de problemas

- **Falha no `/health` no global-setup**: confirme API em `http://127.0.0.1:3001/health` e `DATABASE_URL` na porta `27018`.
- **Vite já rodando em outra porta**: defina `E2E_BASE_URL` e, se necessário, `E2E_SKIP_WEB_SERVER=1`.
- **Conflito de porta do Mongo**: altere `E2E_MONGO_PORT` em `e2e/.env`.
- **Diagnóstico rápido**: `python e2e/run_e2e.py diagnose`.

## Depuração avançada

Em geral, **não** use `npx playwright test` cru no dia a dia — use o orquestrador para env e logs consistentes.

Para depurar um teste específico com interface visual:

```bash
cd e2e
export E2E_BASE_URL=http://127.0.0.1:5173
export E2E_SKIP_API_SMOKE=1  # opcional, se backend não estiver ativo
npx playwright test --ui
```

Para rodar um único spec com debug verboso:

```bash
python run_e2e.py test tests/login.spec.ts --debug
```

## Playwright — versão e browsers

| Item | Valor |
|------|--------|
| Pacote | `@playwright/test` em `e2e/playwright/package.json` |
| Versão fixada | **1.60.0** (lock + `package.json`; browsers devem ser da mesma versão) |
| Browsers CI | Chromium, Firefox e WebKit (`playwright.config.ts`) |
| Projetos guest | `{browser}-guest` — smoke, rotas e login (sem sessão) |
| Projetos autenticados | `chromium`, `firefox`, `webkit` — dependem de `setup` + `storageState` |

Após `npm ci` em `e2e/playwright`, instale os browsers **com o CLI da mesma versão** do pacote (não use `playwright` global):

```bash
cd e2e/playwright
npm ci
npm run install:browsers:local   # dev (macOS/Linux)
npm run install:browsers         # CI / Ubuntu (--with-deps para libs do sistema)
```

### Fluxos autenticados

1. `global-setup.ts` — bootstrap do admin via `POST /api/auth/bootstrap-admin` (ignora 409 se já existir).
2. `tests/auth.setup.ts` — login real e grava `.auth/admin.json`.
3. Specs `authenticated-*.spec.ts` — dashboard e navegação (turmas/provas) em todos os browsers.

Rodar só Chromium autenticado:

```bash
cd e2e/playwright
npx playwright test --project=chromium
```

Ao atualizar `@playwright/test`, regenere o lock (`npm install`), rode o comando de browsers acima e confirme o job E2E no CI.

## CI (GitHub Actions)

O job `e2e` em `.github/workflows/ci.yml`:

1. `npm ci` em `web/`, `backend/` e `e2e/playwright/`
2. **`npm run install:browsers`** em `e2e/playwright/` (Chromium, Firefox, WebKit + deps de SO)
3. Mongo via `e2e/run_e2e.py up`, API na `:3001` e **`npm test`** com `CI=true` (timeout 40 min)

Em falha, os artefatos `playwright-report`, `playwright-test-results` e `e2e-logs` são publicados.

## Estrutura

```
e2e/
├── .env.example
├── run_e2e.py
├── infra/docker-compose.yml   # Mongo para E2E
└── playwright/
    ├── fixtures/e2e-auth.constants.ts
    ├── playwright.config.ts
    ├── global-setup.ts
    └── tests/
        ├── auth.setup.ts
        ├── authenticated-dashboard.spec.ts
        ├── authenticated-navigation.spec.ts
        └── …
```
