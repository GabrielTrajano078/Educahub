# Estado do projeto (memória entre sessões)

## QA M1

Checklist manual de cenários (papéis, escopo, 401/403) para a fundação da API: `.specs/features/plataforma-avaliacao/qa-m1.md`.

## Decisões

| Data | Decisão | Contexto |
|------|---------|----------|
| — | PRD mantido em `docs/prd/prd.md` com apêndice spec-driven | Rastreabilidade `REQ-*` e ligação a `.specs/`. |
| — | Planejamento por milestones em `ROADMAP.md` | Entrega incremental M1→M5. |

## Preferências

- (Vazio — preencher após feedback do time.)

## Bloqueadores

- Nenhum registrado.

## Lições aprendidas

- (Vazio.)

## Pendentes / ideias adiadas

- **Stack backend:** Node.js.
- **Motor OCR:** Tesseract citado no PRD; validar precisão com layout real do cartão antes de congelar biblioteca.
- **Regras exatas de “distribuição recomendada”** do simulado: depende de tabela oficial ou política municipal — capturar em `spec.md` quando houver fonte.

## To-do imediato sugerido

1. Validar `ROADMAP.md` com stakeholders (secretaria/pedagógico).
2. Executar `.specs/features/plataforma-avaliacao/tasks.md` (M1: T1→T11), começando por modelo `classroomIds` e autorização em `access.ts`.
