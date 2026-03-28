# Design — Plataforma SAEB/SPA-S (LP e MAT)

**Fontes:** [docs/prd/prd.md](../../docs/prd/prd.md), [.specs/project/PROJECT.md](../project/PROJECT.md), [.specs/features/plataforma-avaliacao/spec.md](../features/plataforma-avaliacao/spec.md).

**Stack alvo (repositório):** Node.js, TypeScript, Express 5, MongoDB (Mongoose), Swagger; frontend em `web/` (React 19, Vite, React Router, TanStack Query, Zod). PDF/imagem: pdf-lib, qrcode, jimp, multer.

---

## 1. Objetivo

Viabilizar o fluxo **prova → PDF/cartão → upload → OCR → tabulação → painéis/diagnóstico** com **segregação por papel** e rastreio aos requisitos `REQ-*` da feature `plataforma-avaliacao`.

---

## 2. Arquitetura (contêineres)

| Contêiner | Responsabilidade |
|-----------|------------------|
| **SPA (`web/`)** | Auth na UI, banco de questões (leitura professor), montagem de prova, download de PDFs, upload de imagens, resultados e relatórios. |
| **API (Express)** | AuthZ, CRUD conforme papel, composição de provas, geração de PDF, uploads, orquestração OCR, persistência de resultados e agregações. |
| **MongoDB** | Dados transacionais e leitura para painéis; índices por escola, turma, prova, habilidade. |
| **OCR** | Síncrono para poucos arquivos ou **fila** para lote: imagem → layout do cartão → ID + bolhas A–D → N/A/X. |
| **Cache/materialização** | Agregações escola/município e relatórios pesados (PRD §9.2; NFR no apêndice do PRD). |

**Upload em lote:** evitar bloqueio longo da API — processamento assíncrono e status por arquivo/cartão.

---

## 3. Modelo conceitual

| Entidade (conceito) | Notas |
|---------------------|--------|
| Usuário + papel + vínculos | Turmas, escola, município para escopo. |
| Questão | LP/MAT, ano, matriz SAEB/SPA-S, habilidade, dificuldade, gabarito A–D; só admin edita conteúdo. |
| Prova (versão) | Tipo (personalizada, recuperação, simulado), itens ordenados, **código único**, vínculo turma/escola. |
| Aluno, Turma, Escola, Município | Hierarquia para tabulação e políticas de acesso. |
| Cartão (instância) | Aluno + prova; opcional referência ao PDF gerado. |
| Submissão de correção | Lote de imagens; estado por imagem (pendente, ok, erro). |
| Resposta tabulada | Por questão: alternativa, N/A, X; acerto/erro; agregável por habilidade. |
| Diagnóstico / relatório | Derivados: dominadas/não dominadas, eixos LP/MAT, sugestões de intervenção. |

**Regras:** professor não edita item do banco; admin exige metadados obrigatórios; simulado com distribuição configurada/documentada; recuperação amparada em diagnóstico anterior.

---

## 4. API — módulos

Agrupamento sugerido (alinhado a `src/modules/*`):

- **Auth** — sessão/token; contexto de papel e escopos.
- **Questões (admin)** — CRUD com validação estrita.
- **Questões (professor)** — GET com filtros; sem PATCH de conteúdo/gabarito.
- **Sugestão** — “sugerir conjunto” por habilidades deficitárias (regra documentada).
- **Provas** — criar (três tipos), listar, detalhar, PDF prova + cartões em lote.
- **Correção** — upload(s), status, resultados por aluno/prova.
- **Resultados / tabulação** — aluno, turma; escola/município conforme papel.
- **Relatórios** — diagnóstico SAEB/SPA-S, eixos, texto de intervenção.

Contratos documentados em OpenAPI/Swagger.

---

## 5. Autorização

| Papel | Escopo |
|--------|--------|
| Professor | Turmas vinculadas |
| Coordenador | Escola |
| Secretaria / gestão municipal | Município |
| Administrador | Global (questões, padrões, usuários) |

Middleware de autenticação + **política por recurso** que valida `classId` / `schoolId` / `municipalityId` em cada operação. Rastreio: REQ-AUTH-01 … REQ-AUTH-04.

---

## 6. Frontend — mapa de telas

**Professor:** login → seleção LP/MAT e ano → banco (filtros, seleção, sugerir) → wizard de prova (tipo → parâmetros → revisão → PDF) → lista de provas / correção (upload, progresso, erros por cartão) → resultados da turma (ranking, % por descritor, mapa de calor — REQ-UX-01).

**Coordenador / secretaria:** painéis agregados no respectivo escopo (comparativos, habilidades críticas).

**Admin:** CRUD de questões, usuários, parâmetros de simulado (se configuráveis).

**Padrões:** React Router; TanStack Query; Zod alinhado aos DTOs da API.

---

## 7. Pipeline OCR

1. Validação de arquivo (tipo, tamanho, limite de lote).
2. Pré-processamento (ex.: jimp): rotação leve, contraste, redução de sombra (PRD §5.2).
3. Regiões com **layout fixo** do cartão gerado pelo sistema.
4. Leitura de bolhas A–D; comparar com gabarito incluindo **N/A** (anulada) e **X** (em branco).
5. Identificação do aluno preferencialmente por **ID/QR** no PDF (v1), não só OCR de manuscrito.
6. Falha em um cartão **não** descarta o lote inteiro (NFR do PRD, apêndice).

---

## 8. Desempenho e segurança

- Painéis grandes: projeções enxutas, índices compostos; evoluir para cache ou materialização com TTL ou jobs.
- Não registrar dados sensíveis de alunos em logs.
- Menor privilégio por papel; sem vazamento entre escolas/turmas.

---

## 9. Rastreio PRD §10 → este documento

| Entrega PRD | Seção |
|-------------|--------|
| Arquitetura técnica | §2–§5, §7–§8 |
| Wireframe / telas | §6 |
| Fluxo OCR | §7 |
| Banco com filtros | §3–§4 |
| Prova + PDF | §3–§4 |
| Correção exemplo | §7 + testes com fixture de imagem |
| Relatórios turma | §4, §6 |

Matriz PRD → REQ: ver tabela no apêndice A de `docs/prd/prd.md`.

---

## 10. Nota de stack (PROJECT.md)

Implementação atual em Node/TypeScript/MongoDB. Preferência futura por Go (registrada em `STATE.md`) **não altera** os contêineres lógicos nem os contratos públicos da API; apenas o runtime da camada HTTP e eventual adaptação da persistência.
