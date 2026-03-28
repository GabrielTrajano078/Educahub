# SAEB / SPA-S — Plataforma de Avaliação, Correção e Diagnóstico (LP e MAT)

**Visão:** Sistema web para professores e gestores criarem provas alinhadas a SAEB/SPA-S, aplicarem avaliações com cartões-resposta, corrigirem por imagem (OCR) e acompanharem desempenho por aluno, turma, escola e município.

**Para:** Professores (turma), coordenadores (escola), secretaria/gestão municipal, administradores do sistema.

**Resolve:** Centralizar banco de questões por habilidade, automatizar geração de provas e cartões, reduzir trabalho manual de correção e oferecer diagnóstico pedagógico estruturado.

## Metas

- Permitir fluxo completo do professor: montar prova → PDF + cartão → upload de imagens → resultado tabulado com critérios de verificação objetivos.
- Garantir segregação de acesso por papel (turma / escola / município / admin) com políticas auditáveis.
- Manter rastreabilidade de requisitos do PRD para implementação e testes (IDs `REQ-*` e histórico em `.specs/`).

## Stack (repositório atual)

**Núcleo (raiz do projeto):**

- Runtime: Node.js
- Linguagem: TypeScript
- API: Express 5
- Dados: MongoDB (Mongoose)
- Documentação API: Swagger UI
- PDF/QR/imagem: pdf-lib, qrcode, jimp, multer

**Frontend:** pasta `web/` (ver `web/package.json` para stack exata).

**Nota de alinhamento:** O PRD original cita stack flexível (Node/Python/Laravel). As **regras do workspace** preferem backend em Go; isso está registrado em `STATE.md` como decisão pendente ou migração futura.

## Escopo

**v1 inclui (alvo do produto):**

- Papéis: professor, coordenador, secretaria/município, administrador, com permissões distintas.
- Banco de questões objetivas (A–D) com metadados: disciplina, ano, matriz (SAEB/SPA-S), habilidade, dificuldade; cadastro admin; professor seleciona sem editar itens do banco.
- Tipos de prova: personalizada por habilidade, recuperação com base em diagnóstico, simulado com distribuição recomendada.
- Geração de cartão-resposta em PDF (lote) com identificação da prova e do aluno.
- Pipeline de upload de imagens, OCR, gabarito, estados N/A/X para anulada/em branco.
- Tabulação e painéis: aluno, turma, escola, município; relatórios de diagnóstico SAEB/SPA-S.

**Explicitamente fora de escopo (v1):**

- Questões discursivas corrigidas automaticamente (apenas menção a expansão futura no PRD).
- App mobile nativo dedicado (fluxo assume navegador/câmera ou upload de arquivo).
- Integração oficial com sistemas governamentais não especificados no PRD (definir caso a caso).

## Restrições

- **Técnicas:** OCR com acurácia alta para marcações A–D; tolerância a foto torta/sombra leve; relatórios grandes com estratégia de desempenho (cache/materialização).
- **Segurança:** Autenticação e autorização por nível; não expor dados de alunos entre escolas/turmas sem permissão.
- **Produto:** Conformidade pedagógica com matrizes SAEB e SPA-S nos metadados e relatórios.
