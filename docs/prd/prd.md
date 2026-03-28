# DESCRIÇÃO TÉCNICA DO SISTEMA (VERSÃO PARA DESENVOLVEDOR)

## Sistema de Avaliação, Correção e Diagnóstico – LP e MAT (5º e 9º ano)

---

## 1. ESTRUTURA DO SISTEMA

### 1.1 Usuários

- Professor
  - Cria provas
  - Aplica avaliações
  - Sobe cartões-resposta
  - Visualiza resultados da sua turma
- Coordenador Escolar
  - Acompanha resultados de todas as turmas da escola
  - Gera relatórios escolares
- Secretaria / Gestão Municipal
  - Acompanha resultados de todas as escolas
  - Tem acesso aos diagnósticos gerais por município
- Administrador do Sistema
  - Gerencia usuários
  - Gerencia o banco de questões
  - Define padrões de provas, simulados e habilidades

---

## 2. BANCO DE QUESTÕES (Núcleo do Sistema)

### 2.1 Organizado por:

- Componente curricular
  - Língua Portuguesa
  - Matemática
- Ano
  - 5º ano
  - 9º ano
- Matriz avaliativa
  - SAEB
  - SPA-S
- Habilidade / Descritor
- Dificuldade
  - Fácil
  - Médio
  - Difícil

### 2.2 Funcionalidades

- Cadastro manual de questões (admin)
- Tagging obrigatório da habilidade SAEB/SPA-S
- Professores podem selecionar, mas não editar, questões do banco
- Sistema sugere automaticamente questões com base em:
  - Diagnósticos anteriores
  - Ano e disciplina
  - Habilidades deficientes

### 2.3 Tipos de questões

- Objetivas (A, B, C, D) – obrigatórias
- Possibilidade de expansão futura para discursivas

---

## 3. CRIAÇÃO DE PROVAS

### 3.1 Tipos de Provas Disponíveis

1. Prova Personalizada por Habilidade
   - Professor seleciona:
     - Disciplina (LP/MAT)
     - Ano (5º/9º)
     - Habilidades desejadas
     - Quantidade de questões por habilidade
2. Prova para Recuperação de Habilidades Deficientes
   - Sistema mostra diagnóstico anterior
   - Professor ou coordenador seleciona as habilidades críticas
   - Prova é gerada automaticamente
3. Simulados
   - Alinhados ao padrão SAEB e SPA-S
   - Sistema gera automaticamente a distribuição recomendada de habilidades

---

## 4. CARTÕES-RESPOSTA (Gerados Automaticamente)

### 4.1 Conteúdo do Cartão

- Nome do aluno
- Turma
- Escola
- Código da Prova
- Questões (A/B/C/D)
- Campo para identificação automática (ID)

### 4.2 Geração

- PDF
- Impressão em lote
- Diferentes cartões para cada prova gerada

---

## 5. CORREÇÃO AUTOMÁTICA POR IMAGEM

### 5.1 Processo

1. Professor tira foto ou escaneia o cartão-resposta
2. Faz upload (arquivo único ou vários arquivos)
3. O sistema processa por OCR:
   - Identifica aluno
   - Lê marcações
   - Compara com o gabarito
4. Gera automaticamente os acertos/erros

### 5.2 Detalhes técnicos

- Tolerância a imagens tortas / sombra leve
- Algoritmo deve reconhecer 4 alternativas (A-D)
- Validação:
  - Questão anulada → “N/A”
  - Questão em branco → “X”

---

## 6. TABULAÇÃO DOS RESULTADOS

### 6.1 Níveis de Tabulação

- Aluno individual
  - Acertos por habilidade
  - Percentual geral
- Turma
  - Ranking por aluno
  - Mapa de calor (habilidades dominadas e não dominadas)
  - Percentual de acerto por descritor
- Escola
  - Comparativo entre turmas
  - Gaps por disciplina (LP/MAT)
- Município inteiro
  - Comparativo entre escolas
  - Habilidades críticas da rede
  - Painel geral do município

---

## 7. RELATÓRIOS DE DIAGNÓSTICO (SAEB / SPA-S)

Gerados automaticamente:

- Desempenho por habilidade
- Desempenho por eixo
  - LP: leitura, interpretação, gêneros textuais etc.
  - MAT: números, álgebra, geometria, estatística
- Habilidades dominadas
- Habilidades não dominadas
- Sugestões de intervenção pedagógica
- Comparação entre 5º e 9º anos (opcional)

---

## 8. FLUXO DE FUNCIONAMENTO (para o Desenvolvedor)

### 8.1 PASSO A PASSO DO USUÁRIO

1. Professor faz login
2. Seleciona disciplina (LP/MAT)
3. Escolhe o ano (5º ou 9º ano)
4. Acessa o banco de questões
5. Seleciona habilidades → sistema filtra automaticamente
6. Monta a prova → sistema gera o PDF + cartão-resposta
7. Professor aplica a prova
8. Tira foto dos cartões → envia para o sistema
9. O sistema corrige automaticamente
10. Relatórios são liberados em painel
11. Coordenador e secretaria têm acesso ampliado

---

## 9. REQUISITOS MÍNIMOS PARA O DESENVOLVEDOR

### 9.1 Tecnologias sugeridas (flexível)

- Backend: Node.js / Python / Laravel
- Frontend: React / Angular / Vue
- Banco de dados: PostgreSQL
- OCR: Tesseract (ou outro algoritmo robusto)
- Hospedagem: AWS / Azure / Google Cloud

### 9.2 Pontos críticos

- OCR deve ter acurácia alta para marcações múltipla escolha
- Painéis precisam ser rápidos (cache para relatórios grandes)
- Segurança com autenticação por nível de acesso
- Arquitetura preparada para expansão futura

---

## 10. ENTREGÁVEIS QUE O DESENVOLVEDOR PRECISA TE APRESENTAR

Para garantir fidelidade ao projeto, peça:

- ✔ Documento técnico com arquitetura
- ✔ Protótipo de telas (wireframe)
- ✔ Fluxo de OCR sendo testado
- ✔ Banco de questões funcionando com filtros
- ✔ Primeira prova sendo gerada
- ✔ Correção de um cartão-resposta de exemplo
- ✔ Relatórios básicos de turma

---

## Apêndice A — Refinamento spec-driven

Este apêndice amarra o PRD ao planejamento vivo em `.specs/` (metodologia **spec-driven**, p.ex. skill `tlc-spec-driven`).

| Artefato | Caminho |
|----------|---------|
| Visão, stack do repo, escopo explícito | `.specs/project/PROJECT.md` |
| Milestones M1–M5 e features | `.specs/project/ROADMAP.md` |
| Decisões, bloqueadores, pendentes | `.specs/project/STATE.md` |
| Histórias, critérios WHEN/THEN, IDs `REQ-*` | `.specs/features/plataforma-avaliacao/spec.md` |

### Glossário

| Termo | Significado |
|-------|-------------|
| SAEB | Sistema de Avaliação da Educação Básica — referência de matriz avaliativa. |
| SPA-S | Avaliação citada no PRD como matriz paralela/complementar ao SAEB no produto. |
| Habilidade / descritor | Unidade curricular de referência para classificar questões e resultados. |
| Cartão-resposta | Folha com marcações A–D e identificadores para correção automática por imagem. |
| Tabulação | Agregação de resultados (aluno → turma → escola → município). |

### Requisitos não funcionais (resumo)

- **Desempenho:** painéis agregados devem usar cache ou estratégia equivalente para volumes grandes (§9.2).
- **Segurança:** autenticação e autorização por nível de acesso; princípio do menor privilégio por papel.
- **Confiabilidade:** pipeline de OCR tolerante a falhas parciais em lote (um cartão inválido não descarta o lote inteiro).
- **Manutenibilidade:** requisitos funcionais rastreados por `REQ-*` na especificação em `.specs/features/plataforma-avaliacao/spec.md`.

### Matriz de rastreabilidade PRD → REQ

| Seção PRD | IDs de requisito (detalhe em `spec.md`) |
|-----------|-------------------------------------------|
| §1 Usuários e escopos | REQ-AUTH-01 … REQ-AUTH-04 |
| §2 Banco de questões | REQ-QB-01 … REQ-QB-04 |
| §3–§4 Provas e cartões | REQ-PROVA-01 … REQ-PROVA-05 |
| §5 Correção / OCR | REQ-OCR-01 … REQ-OCR-05 |
| §6 Tabulação (turma/aluno) | REQ-TAB-01, REQ-TAB-02 |
| §6 Níveis escola / município | REQ-PAINEL-01, REQ-PAINEL-02 |
| §7 Relatórios diagnóstico | REQ-REL-01, REQ-REL-02 |
| §6 Mapa de calor (UX) | REQ-UX-01 |
