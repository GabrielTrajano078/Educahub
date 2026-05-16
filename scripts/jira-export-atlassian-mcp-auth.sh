#!/usr/bin/env bash
# Gera Authorization Basic (email:token em Base64) para o MCP da Atlassian.
# Depende das variáveis no .env à raiz do repositório: JIRA_ATLASSIAN_EMAIL e JIRA_API_TOKEN.
#
# Exemplo antes de abrir o Cursor pelo terminal:
#   eval "$(./scripts/jira-export-atlassian-mcp-auth.sh)"
#
# Depois Cursor resolve ${env:ATLASSIAN_MCP_AUTHORIZATION} em .cursor/mcp.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ ! -f "$ROOT/.env" ]]; then
  echo "Falta $ROOT/.env (com JIRA_ATLASSIAN_EMAIL e JIRA_API_TOKEN)." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ROOT/.env"
set +a
if [[ -z "${JIRA_ATLASSIAN_EMAIL:-}" ]] || [[ -z "${JIRA_API_TOKEN:-}" ]]; then
  echo "Define JIRA_ATLASSIAN_EMAIL e JIRA_API_TOKEN no .env." >&2
  exit 1
fi
B64="$(printf '%s:%s' "$JIRA_ATLASSIAN_EMAIL" "$JIRA_API_TOKEN" | base64)"
printf 'export ATLASSIAN_MCP_AUTHORIZATION="Basic %s"\n' "$B64"
