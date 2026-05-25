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
