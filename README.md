# SAEB / SPA-S - Diagnostico

Repositorio organizado em duas aplicacoes:

- `backend/`: API Node.js/Express + MongoDB
- `web/`: frontend

## Pre-requisitos

- Node.js 20+
- Docker Desktop (ou Docker Engine + Compose v2) ou MongoDB local na porta `27017`

## Configuracao rapida

1. Variaveis da API:

```bash
cp backend/.env.example backend/.env
```

2. Subir Mongo e popular a base:

```bash
cd backend
npm install
npm run setup
```

3. Variaveis do frontend:

```bash
cp web/.env.example web/.env
```

## Desenvolvimento

Terminal 1 - backend:

```bash
cd backend
npm run dev
```

Terminal 2 - frontend:

```bash
cd web
npm install
npm run dev
```

## Enderecos locais

- API: `http://localhost:3001/health`
- Swagger: `http://localhost:3001/docs`
- App: `http://localhost:5173`

## Usuarios do seed

Senha para todos: `Admin123`

- `admin@saeb.local`
- `professor@saeb.local`
- `gestor@saeb.local`

## Comandos uteis do backend

Todos executados dentro de `backend/`.

| Comando | Descricao |
|---|---|
| `npm run setup` | Sobe Mongo (Docker) e executa o seed |
| `npm run db:up` | Sobe o Mongo com Docker Compose |
| `npm run db:down` | Para os containers |
| `npm run db:reset` | Remove volume e sobe de novo |
| `npm run seed` | Executa apenas o seed |
| `npm run dev` | Inicia a API em modo desenvolvimento |
