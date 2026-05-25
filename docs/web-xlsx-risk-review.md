# QODE-32 — Revisão de risco da dependência `xlsx` (web)

## Contexto

O frontend usa `xlsx` para importação e template de planilhas em:

- `web/src/lib/excel-import.ts` (import dinâmico para leitura e geração de arquivo)
- fluxos de importação de turmas e alunos

Versão atual em `web/package.json`: `xlsx@0.18.5`.

## Resultado da auditoria

Comando executado:

```bash
cd web
npm audit --omit=dev
```

Resultado (confirmado em 24/05/2026):

- 1 vulnerabilidade `high` no pacote direto `xlsx`
- Advisories:
  - Prototype Pollution (`GHSA-4r6h-8v6p-xvw6`) — faixa afetada `<0.19.3`
  - ReDoS (`GHSA-5pgg-2g8v-p4x9`) — faixa afetada `<0.20.2`
- `fixAvailable: false` — **ver nota abaixo**

### Por que não há fix disponível no npm

As versões corrigidas (`>=0.19.3`, `>=0.20.2`) existem, mas o projeto SheetJS
as removeu do registry público do npm após a versão `0.18.5`. A versão `0.18.5`
é permanentemente a **última** no npm público. As versões novas estão disponíveis
apenas no registry comercial do SheetJS (`https://cdn.sheetjs.com`), que exige
licença paga para uso em produção. Portanto, **a auditoria via `npm audit` nunca
sinalizará um fix disponível** enquanto `xlsx` for instalado do npm.

## Decisão técnica

Manter `xlsx` no curto prazo com mitigação operacional, porque:

1. o pacote é usado em fluxo de produtividade do produto (importação de planilhas);
2. não há versão corrigida no npm público — a migração para o registry comercial
   do SheetJS requer avaliação de licenciamento e custo;
3. remover ou migrar agora impacta UX e prazo sem alternativa pronta validada.

## Mitigações adotadas agora

- Uso restrito ao cliente (web), sem execução no backend.
- Import dinâmico em `excel-import.ts`, reduzindo superfície no carregamento inicial.
- Fluxo de parse limitado à primeira aba e colunas esperadas (menor superfície de ataque para ReDoS e Prototype Pollution).
- Nenhuma entrada não sanitizada do servidor é passada diretamente ao parser.

## Próximos passos (backlog)

1. **Avaliar migração para alternativa no npm** — candidatas mantidas no registry público:
   - [`exceljs`](https://www.npmjs.com/package/exceljs) — leitura/escrita XLSX, ativamente mantido
   - [`read-excel-file`](https://www.npmjs.com/package/read-excel-file) — parse leve, somente leitura
   - Abrir spike quando houver janela de prazo para validar compatibilidade com os fluxos de importação e template.
2. **Não monitorar `npm view xlsx version`** — a versão no npm não vai mudar.
   Em vez disso, monitorar:
   - `npm audit --omit=dev` (qualquer mudança de severidade ou novo advisory)
   - CVEs no GHSA diretamente: [GHSA-4r6h-8v6p-xvw6](https://github.com/advisories/GHSA-4r6h-8v6p-xvw6) e [GHSA-5pgg-2g8v-p4x9](https://github.com/advisories/GHSA-5pgg-2g8v-p4x9)
3. Se o risco aumentar (ex.: exploit público ativo), priorizar o spike de migração.

## Rotina recomendada para CI/qualidade

Adicionar job não bloqueante de auditoria mensal para dependências de produção
do `web`, com alerta para a equipa quando houver:

- mudança de severidade no advisory existente
- novo advisory para `xlsx`
- fix disponível (indicaria mudança inesperada no registry)
