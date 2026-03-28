# SAEB / SPA-S — Diagnóstico (API + Web)

## Pré-requisitos

- Node.js 20+
- Docker Desktop (ou Docker Engine + Compose v2) **ou** MongoDB local na porta `27017`

## Configuração rápida

1. **Variáveis da API** (raiz do repositório):

   ```bash
   cp .env.example .env
   ```

   Ajuste `JWT_SECRET` em produção. `DATABASE_URL` no exemplo aponta para `localhost:27017`, compatível com o Compose abaixo.

2. **MongoDB com Docker** (cria o volume e sobe o servidor; o banco `spas_saeb` é criado na primeira escrita pela API/seed):

   ```bash
   npm run setup
   ```

   Equivale a: `docker compose up -d --wait` (aguarda o healthcheck) + `npm run seed`.

3. **Só subir o banco** (sem seed):

   ```bash
   npm run db:up
   ```

4. **Frontend** (`web/`): opcionalmente copie o exemplo (proxy do Vite usa a API em `3001`):

   ```bash
   cp web/.env.example web/.env
   ```

## Desenvolvimento

Terminal 1 — API (porta `3001` por padrão, ver `PORT` no `.env`):

```bash
npm install
npm run dev
```

Terminal 2 — Web (porta `5173`):

```bash
cd web && npm install && npm run dev
```

- API: `http://localhost:3001/health`
- Swagger: `http://localhost:3001/docs`
- App: `http://localhost:5173`

## Usuários do seed (senha `Admin123`)

- `admin@saeb.local`
- `professor@saeb.local`
- `gestor@saeb.local`

## Comandos úteis

| Comando        | Descrição                          |
|----------------|-------------------------------------|
| `npm run setup` | Sobe Mongo (Docker) + executa seed |
| `npm run db:down` | Para os containers                |
| `npm run db:reset` | Remove volume, sobe de novo + seed manual depois |
| `npm run seed` | Só seed (Mongo precisa estar acessível) |

Se não usar Docker, instale MongoDB localmente, mantenha `DATABASE_URL` coerente e execute `npm run seed`.
