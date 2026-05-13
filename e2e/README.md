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

## Fluxo recomendado

```bash
# 1) Mongo isolado (porta host 27018 por padrão)
python e2e/run_e2e.py up

# 2) Backend apontando para esse Mongo (ex.: MONGODB_URI com porta 27018)
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

Ajuste `MONGODB_URI` no backend para o host/porta do passo `up` antes de rodar a suíte completa com smoke de API.

## Depuração avançada

Ver `docs/guides/e2e-debugging.md`. Em geral, **não** use `npx playwright test` cru no dia a dia — use o orquestrador para env e logs consistentes; exceção: depurar com `cd e2e/playwright && npx playwright test --ui` após exportar `E2E_BASE_URL` e `E2E_SKIP_API_SMOKE` se necessário.

## CI (GitHub Actions)

O job `e2e` em `.github/workflows/ci.yml` sobe o Mongo via `e2e/run_e2e.py up`, a API (`PORT=3001`, `DATABASE_URL` na porta `27018` do compose E2E) e executa `npx playwright test` com `CI=true`. Em falha, os artefatos `playwright-report`, `playwright-test-results` e `e2e-logs` são publicados.

## Estrutura

```
e2e/
├── .env.example
├── run_e2e.py
├── infra/docker-compose.yml   # Mongo para E2E
└── playwright/
    ├── playwright.config.ts
    ├── global-setup.ts
    └── tests/
```
