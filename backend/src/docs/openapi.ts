const objectId = {
  type: "string",
  pattern: String.raw`^[a-f\d]{24}$`,
  example: "69c6f8703a3ba38a6a0cfe7c",
};

const errorResponse = {
  description: "Erro da API",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: {
          message: { type: "string", example: "Erro interno do servidor." },
        },
      },
    },
  },
};

const idPathParameter = { name: "id", in: "path", required: true, schema: objectId };

function deleteByIdOperation(tag: string, summary: string) {
  return {
    tags: [tag],
    summary,
    security: [{ bearerAuth: [] }],
    parameters: [idPathParameter],
    responses: {
      204: { description: "Recurso removido" },
      400: errorResponse,
      401: errorResponse,
      403: errorResponse,
      404: errorResponse,
      409: errorResponse,
    },
  };
}

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "SAEB Diagnostico API",
    version: "1.0.0",
    description:
      "API para autenticacao, cadastro escolar, montagem de provas, geracao de cartoes-resposta e diagnosticos pedagógicos.",
  },
  servers: [
    {
      url: "http://localhost:3001",
      description: "Ambiente local",
    },
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Schools" },
    { name: "Classes" },
    { name: "Students" },
    { name: "Questions" },
    { name: "Exams" },
    { name: "Results" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      IdResponse: {
        type: "object",
        properties: {
          id: objectId,
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", format: "email", example: "admin@saeb.local" },
          password: { type: "string", example: "Admin123" },
        },
      },
      BootstrapAdminRequest: {
        type: "object",
        required: ["fullName", "email", "password"],
        properties: {
          fullName: { type: "string", example: "Administrador Local" },
          email: { type: "string", format: "email", example: "admin@saeb.local" },
          password: { type: "string", example: "Admin123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          token: { type: "string", example: "eyJhbGciOi..." },
          user: {
            type: "object",
            properties: {
              id: objectId,
              fullName: { type: "string", example: "Administrador Local" },
              email: { type: "string", format: "email", example: "admin@saeb.local" },
              role: { type: "string", enum: ["admin", "professor", "coordenador", "gestor"] },
              schoolId: { anyOf: [objectId, { type: "null" }] },
              municipalityCode: { anyOf: [{ type: "string", example: "2304400" }, { type: "null" }] },
              classroomIds: {
                type: "array",
                items: objectId,
                description: "Turmas atribuidas ao professor; vazio para demais perfis.",
              },
            },
          },
        },
      },
      PatchProfessorClassroomsRequest: {
        type: "object",
        required: ["classroomIds"],
        properties: {
          classroomIds: {
            type: "array",
            items: objectId,
            description: "Lista de IDs de turma da mesma escola do professor.",
          },
        },
      },
      ProfessorClassroomsResponse: {
        type: "object",
        properties: {
          id: objectId,
          classroomIds: { type: "array", items: objectId },
        },
      },
      SchoolRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", example: "EMEF Jose de Alencar" },
          city: { type: "string", example: "Fortaleza" },
          municipalityCode: { type: "string", example: "2304400" },
        },
      },
      ClassroomRequest: {
        type: "object",
        required: ["schoolId", "name", "grade"],
        properties: {
          schoolId: objectId,
          name: { type: "string", example: "5A Manha" },
          grade: { type: "string", enum: ["5", "9"], example: "5" },
        },
      },
      StudentRequest: {
        type: "object",
        required: ["schoolId", "classroomId", "fullName", "registrationCode"],
        properties: {
          schoolId: objectId,
          classroomId: objectId,
          fullName: { type: "string", example: "Ana Clara Sousa" },
          registrationCode: { type: "string", example: "ALU-0001" },
        },
      },
      QuestionRequest: {
        type: "object",
        required: ["discipline", "grade", "descriptor", "prompt", "optionA", "optionB", "optionC", "optionD", "answer"],
        properties: {
          discipline: { type: "string", enum: ["LP", "MAT"], example: "LP" },
          grade: { type: "string", enum: ["5", "9"], example: "5" },
          framework: { type: "string", enum: ["SAEB"], example: "SAEB", default: "SAEB" },
          descriptor: { type: "string", example: "D1" },
          axis: {
            type: "string",
            enum: [
              "LEITURA",
              "INTERPRETACAO",
              "GENEROS_TEXTUAIS",
              "LINGUA_ESTUDO",
              "NUMEROS",
              "ALGEBRA",
              "GEOMETRIA",
              "ESTATISTICA",
              "GRANDEZAS_MEDIDAS",
            ],
            example: "LEITURA",
          },
          prompt: { type: "string", example: "Qual e a finalidade principal do texto apresentado?" },
          optionA: { type: "string", example: "Contar uma historia." },
          optionB: { type: "string", example: "Dar uma instrucao." },
          optionC: { type: "string", example: "Fazer um convite." },
          optionD: { type: "string", example: "Expressar uma opiniao." },
          answer: { type: "string", enum: ["A", "B", "C", "D"], example: "B" },
        },
      },
      ExamRequest: {
        type: "object",
        required: ["schoolId", "classroomId", "title", "discipline", "grade"],
        properties: {
          schoolId: objectId,
          classroomId: objectId,
          title: { type: "string", example: "Simulado Diagnostico LP 5o Ano" },
          discipline: { type: "string", enum: ["LP", "MAT"], example: "LP" },
          grade: { type: "string", enum: ["5", "9"], example: "5" },
          framework: { type: "string", enum: ["SAEB"], example: "SAEB", default: "SAEB" },
          examType: {
            type: "string",
            enum: [
              "DIAGNOSTICO_INICIAL",
              "SIMULADO_1",
              "SIMULADO_2",
              "SIMULADO_3",
              "SIMULADO_4",
              "DIAGNOSTICO_FINAL",
            ],
            example: "SIMULADO_1",
          },
          sourceType: {
            type: "string",
            enum: ["QUESTION_BANK", "PDF_IMPORT"],
            example: "QUESTION_BANK",
          },
          status: {
            type: "string",
            enum: ["DRAFT", "READY", "APPLIED", "CLOSED"],
            example: "DRAFT",
          },
          questionIds: {
            type: "array",
            items: objectId,
          },
          questionCount: { type: "integer", example: 20 },
          voidedQuestionIds: {
            type: "array",
            items: objectId,
          },
          blueprint: {
            type: "array",
            items: {
              type: "object",
              required: ["descriptor", "count"],
              properties: {
                descriptor: { type: "string", example: "D1" },
                count: { type: "integer", example: 3 },
              },
            },
          },
          blueprintByAxis: {
            type: "array",
            items: {
              type: "object",
              required: ["axis", "count"],
              properties: {
                axis: { type: "string", example: "LEITURA" },
                count: { type: "integer", example: 3 },
              },
            },
          },
        },
      },
      AnswerKeyRequest: {
        type: "object",
        properties: {
          notes: { type: "string", example: "Gabarito oficial da aplicacao demo." },
          items: {
            type: "array",
            items: {
              type: "object",
              required: ["order", "correctAnswer"],
              properties: {
                order: { type: "integer", example: 1 },
                questionId: objectId,
                correctAnswer: { type: "string", enum: ["A", "B", "C", "D", "N/A"], example: "B" },
                isVoided: { type: "boolean", example: false },
              },
            },
          },
        },
      },
      GenerateSheetsRequest: {
        type: "object",
        properties: {
          studentIds: {
            type: "array",
            items: objectId,
          },
          questionsPerPage: { type: "integer", example: 20 },
        },
      },
      RegisterAnswerSheetRequest: {
        type: "object",
        required: ["examId", "studentId"],
        properties: {
          examId: objectId,
          studentId: objectId,
          uploadUrl: { type: "string", format: "uri", example: "http://localhost:3001/uploads/demo.png" },
        },
      },
      CorrectionByOrderRequest: {
        type: "object",
        required: ["answerSheetId", "marks"],
        properties: {
          answerSheetId: objectId,
          marks: {
            type: "array",
            items: {
              type: "object",
              required: ["order", "markedAnswer"],
              properties: {
                order: { type: "integer", example: 1 },
                markedAnswer: { type: "string", enum: ["A", "B", "C", "D"], example: "B" },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Verifica se a API esta ativa",
        responses: {
          200: {
            description: "API ativa",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    status: { type: "string", example: "ok" },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/auth/bootstrap-admin": {
      post: {
        tags: ["Auth"],
        summary: "Cria o primeiro admin da base",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/BootstrapAdminRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Admin criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IdResponse" },
              },
            },
          },
          409: errorResponse,
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Autentica e devolve JWT",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Login realizado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthResponse" },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
        },
      },
    },
    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Retorna o usuario autenticado",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Perfil autenticado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: objectId,
                    fullName: { type: "string" },
                    email: { type: "string", format: "email" },
                    role: { type: "string" },
                    schoolId: { anyOf: [objectId, { type: "null" }] },
                    municipalityCode: { anyOf: [{ type: "string" }, { type: "null" }] },
                    classroomIds: { type: "array", items: objectId },
                  },
                },
              },
            },
          },
          401: errorResponse,
        },
      },
    },
    "/api/auth/users/{userId}/classrooms": {
      patch: {
        tags: ["Auth"],
        summary: "Admin: atribui turmas a um professor",
        description:
          "Atualiza `classroomIds` apenas para usuarios com role `professor`. Turmas devem existir e pertencer a mesma `schoolId` do professor.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: objectId,
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PatchProfessorClassroomsRequest" },
            },
          },
        },
        responses: {
          200: {
            description: "Turmas atualizadas",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ProfessorClassroomsResponse" },
              },
            },
          },
          400: errorResponse,
          401: errorResponse,
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    "/api/schools": {
      get: {
        tags: ["Schools"],
        summary: "Lista escolas",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "nameContains", in: "query", schema: { type: "string", maxLength: 200 } }],
        responses: {
          200: {
            description: "Lista de escolas",
          },
          403: errorResponse,
        },
      },
      post: {
        tags: ["Schools"],
        summary: "Cria escola",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SchoolRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Escola criada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IdResponse" },
              },
            },
          },
          403: errorResponse,
        },
      },
    },
    "/api/schools/{id}": {
      delete: deleteByIdOperation("Schools", "Remove escola (sem turmas vinculadas)"),
    },
    "/api/classes": {
      get: {
        tags: ["Classes"],
        summary: "Lista turmas",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "schoolId", in: "query", schema: objectId },
          { name: "grade", in: "query", schema: { type: "string", enum: ["5", "9"] } },
          { name: "nameContains", in: "query", schema: { type: "string", maxLength: 200 } },
        ],
        responses: {
          200: { description: "Lista de turmas" },
        },
      },
      post: {
        tags: ["Classes"],
        summary: "Cria turma",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ClassroomRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Turma criada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IdResponse" },
              },
            },
          },
          403: errorResponse,
        },
      },
    },
    "/api/classes/{id}": {
      delete: deleteByIdOperation("Classes", "Remove turma (sem alunos vinculados)"),
    },
    "/api/students": {
      get: {
        tags: ["Students"],
        summary: "Lista alunos",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "schoolId", in: "query", schema: objectId },
          { name: "classroomId", in: "query", schema: objectId },
          { name: "grade", in: "query", schema: { type: "string", enum: ["5", "9"] } },
          { name: "fullNameContains", in: "query", schema: { type: "string", maxLength: 200 } },
        ],
        responses: {
          200: { description: "Lista de alunos" },
        },
      },
      post: {
        tags: ["Students"],
        summary: "Cria aluno",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/StudentRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Aluno criado",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IdResponse" },
              },
            },
          },
          400: errorResponse,
        },
      },
    },
    "/api/students/{id}": {
      delete: deleteByIdOperation("Students", "Remove aluno e dados vinculados (cartoes, resultados)"),
    },
    "/api/questions": {
      get: {
        tags: ["Questions"],
        summary: "Lista questoes do banco",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "discipline", in: "query", schema: { type: "string", enum: ["LP", "MAT"] } },
          { name: "grade", in: "query", schema: { type: "string", enum: ["5", "9"] } },
          { name: "framework", in: "query", schema: { type: "string", enum: ["SAEB"] } },
          { name: "descriptor", in: "query", schema: { type: "string" } },
          { name: "axis", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Lista de questoes" },
        },
      },
      post: {
        tags: ["Questions"],
        summary: "Cria questao",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/QuestionRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Questao criada",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/IdResponse" },
              },
            },
          },
        },
      },
    },
    "/api/questions/{id}": {
      delete: deleteByIdOperation("Questions", "Remove questao (se nao estiver em prova)"),
    },
    "/api/questions/descriptors": {
      get: {
        tags: ["Questions"],
        summary: "Lista descritores distintos do banco (por disciplina e ano)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "discipline", in: "query", required: true, schema: { type: "string", enum: ["LP", "MAT"] } },
          { name: "grade", in: "query", required: true, schema: { type: "string", enum: ["5", "9"] } },
          { name: "framework", in: "query", schema: { type: "string", enum: ["SAEB"], default: "SAEB" } },
        ],
        responses: {
          200: {
            description: "Lista de descritores",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    descriptors: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/questions/suggestions": {
      get: {
        tags: ["Questions"],
        summary: "Sugere descritores fracos da turma",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "classroomId", in: "query", required: true, schema: objectId },
          { name: "discipline", in: "query", required: true, schema: { type: "string", enum: ["LP", "MAT"] } },
          { name: "grade", in: "query", required: true, schema: { type: "string", enum: ["5", "9"] } },
          { name: "framework", in: "query", schema: { type: "string", enum: ["SAEB"], default: "SAEB" } },
          { name: "weakThreshold", in: "query", schema: { type: "number", example: 60 } },
          { name: "limit", in: "query", schema: { type: "integer", example: 10 } },
        ],
        responses: {
          200: { description: "Sugestoes de descritores" },
        },
      },
    },
    "/api/exams": {
      get: {
        tags: ["Exams"],
        summary: "Lista provas",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "schoolId", in: "query", schema: objectId },
          { name: "classroomId", in: "query", schema: objectId },
          { name: "discipline", in: "query", schema: { type: "string", enum: ["LP", "MAT"] } },
          { name: "grade", in: "query", schema: { type: "string", enum: ["5", "9"] } },
          { name: "framework", in: "query", schema: { type: "string", enum: ["SAEB"] } },
          { name: "descriptor", in: "query", schema: { type: "string" } },
          { name: "axis", in: "query", schema: { type: "string" } },
        ],
        responses: {
          200: { description: "Lista de provas" },
        },
      },
      post: {
        tags: ["Exams"],
        summary: "Cria prova",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExamRequest" },
            },
          },
        },
        responses: {
          201: {
            description: "Prova criada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    id: objectId,
                    examCode: { type: "string", example: "A7B9K2Q4" },
                    totalQuestions: { type: "integer", example: 6 },
                  },
                },
              },
            },
          },
          400: errorResponse,
        },
      },
    },
    "/api/exams/blueprint/simulado": {
      get: {
        tags: ["Exams"],
        summary: "Consulta blueprint padrao de simulado",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "discipline", in: "query", required: true, schema: { type: "string", enum: ["LP", "MAT"] } },
          { name: "grade", in: "query", required: true, schema: { type: "string", enum: ["5", "9"] } },
        ],
        responses: {
          200: { description: "Blueprint retornado" },
        },
      },
    },
    "/api/exams/{id}": {
      get: {
        tags: ["Exams"],
        summary: "Detalha prova",
        security: [{ bearerAuth: [] }],
        parameters: [idPathParameter],
        responses: {
          200: { description: "Detalhe da prova" },
          404: errorResponse,
        },
      },
      delete: deleteByIdOperation("Exams", "Remove prova e dados vinculados (gabarito, cartoes, resultados)"),
    },
    "/api/exams/{id}/answer-key": {
      get: {
        tags: ["Exams"],
        summary: "Busca gabarito oficial ativo",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: objectId }],
        responses: {
          200: { description: "Gabarito encontrado" },
          404: errorResponse,
        },
      },
      post: {
        tags: ["Exams"],
        summary: "Publica gabarito oficial",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: objectId }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/AnswerKeyRequest" },
            },
          },
        },
        responses: {
          201: { description: "Gabarito publicado" },
          400: errorResponse,
        },
      },
    },
    "/api/exams/{id}/answer-sheets/generate": {
      post: {
        tags: ["Exams"],
        summary: "Gera PDF de cartoes-resposta",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: objectId }],
        requestBody: {
          required: false,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/GenerateSheetsRequest" },
            },
          },
        },
        responses: {
          201: { description: "Cartoes gerados" },
          400: errorResponse,
        },
      },
    },
    "/api/results/answer-sheets": {
      post: {
        tags: ["Results"],
        summary: "Registra cartao-resposta de um aluno",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterAnswerSheetRequest" },
            },
          },
        },
        responses: {
          201: { description: "Cartao registrado" },
          200: { description: "Cartao ja existente" },
        },
      },
    },
    "/api/results/corrections/by-order": {
      post: {
        tags: ["Results"],
        summary: "Corrige prova manualmente pela ordem das questoes",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CorrectionByOrderRequest" },
            },
          },
        },
        responses: {
          200: { description: "Correcao persistida" },
          400: errorResponse,
        },
      },
    },
    "/api/results/diagnosis/classroom": {
      get: {
        tags: ["Results"],
        summary: "Diagnostico por descritor da turma",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "classroomId", in: "query", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Diagnostico retornado" },
        },
      },
    },
    "/api/results/diagnosis/classroom/by-axis": {
      get: {
        tags: ["Results"],
        summary: "Diagnostico por eixo da turma",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "classroomId", in: "query", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Diagnostico por eixo retornado" },
        },
      },
    },
    "/api/results/student/{studentId}/summary": {
      get: {
        tags: ["Results"],
        summary: "Resumo de desempenho do aluno",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "studentId", in: "path", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Resumo do aluno" },
        },
      },
    },
    "/api/results/classroom/{classroomId}/ranking": {
      get: {
        tags: ["Results"],
        summary: "Ranking da turma",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "classroomId", in: "path", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Ranking retornado" },
        },
      },
    },
    "/api/results/classroom/{classroomId}/heatmap": {
      get: {
        tags: ["Results"],
        summary: "Heatmap pedagogico da turma",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "classroomId", in: "path", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
          { name: "masteryThreshold", in: "query", schema: { type: "number", example: 70 } },
          { name: "weakThreshold", in: "query", schema: { type: "number", example: 50 } },
        ],
        responses: {
          200: { description: "Heatmap retornado" },
        },
      },
    },
    "/api/results/school/{schoolId}/summary": {
      get: {
        tags: ["Results"],
        summary: "Resumo pedagogico da escola",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "schoolId", in: "path", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Resumo da escola" },
        },
      },
    },
    "/api/results/municipality/summary": {
      get: {
        tags: ["Results"],
        summary: "Resumo pedagogico do municipio",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "municipalityCode", in: "query", required: true, schema: { type: "string", example: "2304400" } },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Resumo do municipio" },
        },
      },
    },
    "/api/results/reports/classroom/{classroomId}": {
      get: {
        tags: ["Results"],
        summary: "Relatorio pedagogico consolidado da turma",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "classroomId", in: "path", required: true, schema: objectId },
          { name: "examId", in: "query", schema: objectId },
        ],
        responses: {
          200: { description: "Relatorio da turma" },
        },
      },
    },
  },
} as const;
