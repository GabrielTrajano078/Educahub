# Integração Jira Cloud + Cursor MCP (Scorefy / QODE)

## O que foi configurado neste repo

1. **`.cursor/mcp.json`** — servidor MCP `atlassian` com o endpoint oficial da Atlassian (OAuth 2.1).
2. **`.cursor/rules/jira-config.mdc`** — `cloudId`, chave **`QODE`**, URL do site e referência ao board.

## Passos para concluir no teu Cursor

1. **Reabrir o projeto** ou recarregar a janela do Cursor para carregar o `.cursor/mcp.json`.
2. Abrir **Cursor Settings → MCP** e confirmar que o servidor **atlassian** aparece (ou adiciona manualmente o mesmo URL se o merge automático não aplicar na tua versão).
3. Na primeira utilização, completa o **login OAuth Atlassian** no browser (conta com acesso a `scorefy.atlassian.net`).
4. Nos pedidos ao agente que usem MCP, usar **`cloudId`** `09fff7f0-2ac9-4fff-acd1-eff8ea790011` e **`projectKey`** `QODE` (detalhes na regra `jira-config.mdc`).

## Documentação oficial

- [Getting started — Atlassian Rovo MCP Server](https://support.atlassian.com/rovo/docs/getting-started-with-the-atlassian-remote-mcp-server/)
- [IDEs desktop — configurar MCP](https://support.atlassian.com/rovo/docs/setting-up-ides/)

## Credenciais

Não commits de tokens. Se preferires MCP só na máquina, podes mover a entrada `atlassian` para `~/.cursor/mcp.json` e remover o projeto local, desde que cries o ficheiro com o mesmo JSON da entrada única ou faças merge com os teus outros servidores MCP.
