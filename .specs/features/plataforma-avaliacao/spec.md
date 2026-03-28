# Especificação — Plataforma SAEB/SPA-S (LP e MAT)

## Problema

Escolas precisam aplicar avaliações alinhadas a SAEB e SPA-S com correção rápida e visão de desempenho por habilidade. Planilhas e fluxos manuais não escalam para turma, escola e rede.

## Metas

- [ ] Professor conclui ciclo prova → correção → resultado da turma sem suporte técnico.
- [ ] Coordenador e secretaria enxergam agregações no seu escopo sem vazamento de dados.
- [ ] Administrador mantém banco de questões consistente com metadados obrigatórios.

## Fora de escopo (v1)

| Item | Motivo |
|------|--------|
| Correção automática de discursivas | Apenas roadmap futuro no PRD. |
| OCR de provas sem layout de cartão padronizado | Requer especificação física do formulário. |

---

## Histórias de usuário

### P1: Acesso por papel e escopo ⭐ MVP

**História:** Como gestor ou professor, quero entrar no sistema com meu papel e ver apenas dados do meu escopo, para cumprir LGPD e organização escolar.

**Por que P1:** Sem isso não há uso seguro em produção.

**Critérios de aceite:**

1. WHEN um usuário autenticado com papel professor acessa dados de alunos THEN o sistema SHALL restringir às turmas vinculadas a esse professor.
2. WHEN um coordenador acessa relatórios THEN o sistema SHALL incluir apenas turmas da sua escola.
3. WHEN secretaria/município acessa painéis THEN o sistema SHALL agregar apenas escolas do município autorizado.
4. WHEN um token/sessão inválido é usado THEN o sistema SHALL negar acesso sem expor detalhes internos.

**Teste independente:** Criar usuários de teste por papel e verificar chamadas de API ou rotas com matriz de permissões.

**Rastreio:** REQ-AUTH-01 … REQ-AUTH-04

---

### P1: Banco de questões objetivas com metadados

**História:** Como administrador, quero cadastrar questões A–D com habilidade SAEB/SPA-S obrigatória; como professor, quero filtrar e selecionar sem editar o enunciado.

**Por que P1:** É o núcleo descrito no PRD §2.

**Critérios de aceite:**

1. WHEN admin cria questão sem habilidade/matriz/disciplina/ano THEN o sistema SHALL rejeitar com erro de validação.
2. WHEN professor lista questões THEN o sistema SHALL permitir filtrar por LP/MAT, 5º/9º, matriz, habilidade e dificuldade.
3. WHEN professor tenta alterar texto ou gabarito de item do banco THEN o sistema SHALL impedir (somente leitura ou fluxo exclusivo admin).
4. WHEN existe histórico de desempenho do aluno/turma THEN o sistema SHALL poder sugerir conjunto de questões alinhado a habilidades deficitárias (comportamento mínimo: endpoint ou UI “sugerir” com regra documentada).

**Teste independente:** CRUD admin + lista professor + tentativa de PATCH negada.

**Rastreio:** REQ-QB-01 … REQ-QB-04

---

### P1: Criação de prova e PDF de cartão

**História:** Como professor, quero montar prova (personalizada, recuperação ou simulado) e receber PDF da prova e cartões-resposta em lote.

**Por que P1:** Fecha o fluxo físico da avaliação (PRD §3–4).

**Critérios de aceite:**

1. WHEN professor escolhe tipo “personalizada” e informa habilidades e quantidades THEN o sistema SHALL compor prova e persistir versão com código único de prova.
2. WHEN tipo “recuperação” e há diagnóstico anterior THEN o sistema SHALL exibir habilidades críticas e permitir seleção para montagem automática.
3. WHEN tipo “simulado” THEN o sistema SHALL aplicar distribuição recomendada SAEB/SPA-S conforme regra configurada/documentada.
4. WHEN prova é finalizada THEN o sistema SHALL gerar PDF com campos: aluno, turma, escola, código da prova, alternativas A–D e campo de ID para leitura automática.
5. WHEN impressão em lote é solicitada THEN o sistema SHALL gerar um PDF (ou pacote) com um cartão distinto por aluno da turma selecionada.

**Teste independente:** Gerar uma prova de exemplo e validar campos no PDF.

**Rastreio:** REQ-PROVA-01 … REQ-PROVA-05

---

### P1: Correção por imagem e gabarito

**História:** Como professor, quero enviar fotos dos cartões e obter acertos/erros automáticos.

**Por que P1:** Diferencial central do produto (PRD §5).

**Critérios de aceite:**

1. WHEN professor envia um ou vários arquivos de imagem THEN o sistema SHALL enfileirar/processar e associar à prova correta quando identificável.
2. WHEN OCR lê marcações THEN o sistema SHALL mapear para A/B/C/D com tolerância a rotação leve e sombra leve (definir limiar em testes).
3. WHEN questão está anulada THEN o sistema SHALL registrar resposta como N/A.
4. WHEN aluno deixa em branco THEN o sistema SHALL registrar como X.
5. WHEN processamento falha THEN o sistema SHALL sinalizar item para revisão manual sem corromper outros cartões do lote.

**Teste independente:** Cartão de exemplo do PRD §10 processado ponta a ponta.

**Rastreio:** REQ-OCR-01 … REQ-OCR-05

---

### P2: Tabulação turma e aluno

**História:** Como professor, quero ver acertos por habilidade, percentual geral e ranking da turma.

**Critérios de aceite:**

1. WHEN resultados existem para uma aplicação THEN o sistema SHALL exibir agregação por aluno e por habilidade.
2. WHEN múltiplas provas da mesma turma THEN o sistema SHALL permitir filtrar por prova/data.

**Rastreio:** REQ-TAB-01, REQ-TAB-02

---

### P2: Painéis escola e município

**História:** Como coordenador ou secretaria, quero comparar turmas/escolas e ver gaps por disciplina e habilidades críticas.

**Critérios de aceite:**

1. WHEN coordenador abre painel escola THEN o sistema SHALL mostrar comparativo entre turmas e gaps LP/MAT.
2. WHEN secretaria abre painel município THEN o sistema SHALL mostrar comparativo entre escolas e painel geral.

**Rastreio:** REQ-PAINEL-01, REQ-PAINEL-02

---

### P2: Relatórios de diagnóstico SAEB/SPA-S

**História:** Como gestor, quero relatórios com eixos LP/MAT, habilidades dominadas/não dominadas e sugestões de intervenção.

**Critérios de aceite:**

1. WHEN relatório é gerado THEN o sistema SHALL incluir desempenho por habilidade e por eixo curricular conforme matriz.
2. WHEN opção comparativa 5º vs 9º está habilitada THEN o sistema SHALL exibir comparativo agregado sem identificar alunos individuais além do permitido pela política de escopo.

**Rastreio:** REQ-REL-01, REQ-REL-02

---

### P3: Mapa de calor e UX avançada de painéis

**História:** Como professor, quero mapa de calor de habilidades para priorizar revisão.

**Critérios de aceite:**

1. WHEN turma tem amostra suficiente THEN o sistema SHALL exibir visualização de dominadas vs não dominadas (definir limiar mínimo na implementação).

**Rastreio:** REQ-UX-01

---

## Casos extremos

- WHEN upload excede tamanho máximo THEN o sistema SHALL retornar erro claro e não travar o lote inteiro.
- WHEN OCR retorna baixa confiança THEN o sistema SHALL marcar para revisão.
- WHEN aluno não é identificado no cartão THEN o sistema SHALL impedir associação automática até correção manual.

---

## Rastreabilidade de requisitos

| ID | História | Fase | Status |
|----|----------|------|--------|
| REQ-AUTH-01 | P1 RBAC | Design | Pending |
| REQ-AUTH-02 | P1 RBAC | Design | Pending |
| REQ-AUTH-03 | P1 RBAC | Design | Pending |
| REQ-AUTH-04 | P1 RBAC | Design | Pending |
| REQ-QB-01 | P1 Questões | Design | Pending |
| REQ-QB-02 | P1 Questões | Design | Pending |
| REQ-QB-03 | P1 Questões | Design | Pending |
| REQ-QB-04 | P1 Questões | Design | Pending |
| REQ-PROVA-01 | P1 Prova | Design | Pending |
| REQ-PROVA-02 | P1 Prova | Design | Pending |
| REQ-PROVA-03 | P1 Prova | Design | Pending |
| REQ-PROVA-04 | P1 Prova | Design | Pending |
| REQ-PROVA-05 | P1 Prova | Design | Pending |
| REQ-OCR-01 | P1 OCR | Design | Pending |
| REQ-OCR-02 | P1 OCR | Design | Pending |
| REQ-OCR-03 | P1 OCR | Design | Pending |
| REQ-OCR-04 | P1 OCR | Design | Pending |
| REQ-OCR-05 | P1 OCR | Design | Pending |
| REQ-TAB-01 | P2 Tabulação | - | Pending |
| REQ-TAB-02 | P2 Tabulação | - | Pending |
| REQ-PAINEL-01 | P2 Painéis | - | Pending |
| REQ-PAINEL-02 | P2 Painéis | - | Pending |
| REQ-REL-01 | P2 Relatórios | - | Pending |
| REQ-REL-02 | P2 Relatórios | - | Pending |
| REQ-UX-01 | P3 UX | - | Pending |

**Cobertura:** 24 requisitos rastreados; mapeamento com seções do PRD no apêndice A de `docs/prd/prd.md`.

---

## Critérios de sucesso

- [ ] Demonstração do fluxo professor ponta a ponta em ambiente de staging em &lt; 30 minutos (roteiro de UAT).
- [ ] Taxa de acerto OCR em cartões de referência ≥ alvo definido após piloto (numerar no piloto).
- [ ] Tempo de carregamento de painel municipal com volume de teste dentro de SLA acordado (usar cache).
