import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { connectDatabase } from "../config/db";
import { env } from "../config/env";
import { UserModel } from "../modules/auth/user.model";
import { ClassroomModel } from "../modules/classes/classroom.model";
import { generateUniqueExamCode } from "../modules/exams/exam-code";
import { ExamModel } from "../modules/exams/exam.model";
import { OfficialAnswerKeyModel } from "../modules/exams/official-answer-key.model";
import { QuestionModel } from "../modules/questions/question.model";
import { generateUniqueSheetCode } from "../modules/results/answer-sheet-code";
import { AnswerSheetModel } from "../modules/results/answer-sheet.model";
import { ResultModel } from "../modules/results/result.model";
import { SchoolModel } from "../modules/schools/school.model";
import { StudentModel } from "../modules/students/student.model";

type SeedQuestion = {
  descriptor: string;
  axis: "LEITURA" | "INTERPRETACAO" | "GENEROS_TEXTUAIS" | "LINGUA_ESTUDO";
  difficulty: "FACIL" | "MEDIO" | "DIFICIL";
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  answer: "A" | "B" | "C" | "D";
};

const adminEmail = "admin@saeb.local";
const defaultPassword = "Admin123";

const seedQuestions: SeedQuestion[] = [
  {
    descriptor: "D1",
    axis: "LEITURA",
    difficulty: "FACIL",
    prompt: "No bilhete, qual e a principal finalidade do texto?",
    optionA: "Contar uma historia de aventura.",
    optionB: "Convidar os alunos para a reuniao.",
    optionC: "Vender um produto da escola.",
    optionD: "Ensinar uma receita.",
    answer: "B",
  },
  {
    descriptor: "D2",
    axis: "INTERPRETACAO",
    difficulty: "FACIL",
    prompt: "A palavra amanha indica qual ideia no texto?",
    optionA: "Tempo passado.",
    optionB: "Tempo futuro.",
    optionC: "Lugar.",
    optionD: "Quantidade.",
    answer: "B",
  },
  {
    descriptor: "D3",
    axis: "GENEROS_TEXTUAIS",
    difficulty: "MEDIO",
    prompt: "O texto apresentado e um exemplo de qual genero?",
    optionA: "Bilhete.",
    optionB: "Noticia.",
    optionC: "Poema.",
    optionD: "Piada.",
    answer: "A",
  },
  {
    descriptor: "D4",
    axis: "LINGUA_ESTUDO",
    difficulty: "MEDIO",
    prompt: "Na frase A reuniao sera no patio, a expressao no patio indica:",
    optionA: "Tempo.",
    optionB: "Modo.",
    optionC: "Lugar.",
    optionD: "Causa.",
    answer: "C",
  },
  {
    descriptor: "D5",
    axis: "LEITURA",
    difficulty: "MEDIO",
    prompt: "Qual informacao permite concluir que o texto e dirigido aos alunos?",
    optionA: "O uso da palavra recreio.",
    optionB: "A presenca da assinatura da diretora.",
    optionC: "O horario da reuniao.",
    optionD: "O pedido para levar caderno.",
    answer: "A",
  },
  {
    descriptor: "D6",
    axis: "INTERPRETACAO",
    difficulty: "DIFICIL",
    prompt: "O efeito de sentido da expressao participacao de todos e reforcar:",
    optionA: "Uma ordem sem justificativa.",
    optionB: "A importancia do envolvimento coletivo.",
    optionC: "A proxima avaliacao externa.",
    optionD: "A proibicao de faltar.",
    answer: "B",
  },
];

async function ensureUser(params: {
  fullName: string;
  email: string;
  role: "admin" | "professor" | "coordenador" | "gestor";
  schoolId?: string | null;
  municipalityCode?: string | null;
  classroomIds?: Types.ObjectId[];
}) {
  const passwordHash = await bcrypt.hash(defaultPassword, 10);
  const setDoc: Record<string, unknown> = {
    fullName: params.fullName,
    email: params.email,
    passwordHash,
    role: params.role,
    schoolId: params.schoolId ?? null,
    municipalityCode: params.municipalityCode ?? null,
  };
  if (params.classroomIds !== undefined) {
    setDoc.classroomIds = params.classroomIds;
  }
  return UserModel.findOneAndUpdate(
    { email: params.email },
    { $set: setDoc },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function upsertQuestion(question: SeedQuestion) {
  return QuestionModel.findOneAndUpdate(
    { prompt: question.prompt },
    {
      $set: {
        discipline: "LP",
        grade: "5",
        framework: "SAEB",
        descriptor: question.descriptor,
        axis: question.axis,
        difficulty: question.difficulty,
        prompt: question.prompt,
        optionA: question.optionA,
        optionB: question.optionB,
        optionC: question.optionC,
        optionD: question.optionD,
        answer: question.answer,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

async function main() {
  await connectDatabase();

  const school = await SchoolModel.findOneAndUpdate(
    { name: "EMEF Jose de Alencar" },
    {
      $set: {
        name: "EMEF Jose de Alencar",
        city: "Fortaleza",
        municipalityCode: "2304400",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const admin = await ensureUser({
    fullName: "Administrador Local",
    email: adminEmail,
    role: "admin",
  });

  const gestor = await ensureUser({
    fullName: "Gestor Municipal Demo",
    email: "gestor@saeb.local",
    role: "gestor",
    municipalityCode: "2304400",
  });

  const classroom = await ClassroomModel.findOneAndUpdate(
    { schoolId: school._id, name: "5A Manha" },
    {
      $set: {
        schoolId: school._id,
        name: "5A Manha",
        grade: "5",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const professor = await ensureUser({
    fullName: "Professor Demo",
    email: "professor@saeb.local",
    role: "professor",
    schoolId: String(school._id),
    classroomIds: [new Types.ObjectId(String(classroom._id))],
  });

  const students = await Promise.all(
    [
      { fullName: "Ana Clara Sousa", registrationCode: "ALU-0001" },
      { fullName: "Bruno Lima", registrationCode: "ALU-0002" },
      { fullName: "Carla Mendes", registrationCode: "ALU-0003" },
    ].map((student) =>
      StudentModel.findOneAndUpdate(
        { registrationCode: student.registrationCode },
        {
          $set: {
            schoolId: school._id,
            classroomId: classroom._id,
            fullName: student.fullName,
            registrationCode: student.registrationCode,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    ),
  );

  const questions = await Promise.all(seedQuestions.map(upsertQuestion));

  const existingExam = await ExamModel.findOne({
    classroomId: classroom._id,
    title: "Simulado Diagnostico LP 5o Ano - Demo",
  });

  const examCode = existingExam?.examCode ?? (await generateUniqueExamCode());
  const examQuestions = questions.map((question, index) => ({
    questionId: new Types.ObjectId(String(question._id)),
    order: index + 1,
  }));

  const exam = await ExamModel.findOneAndUpdate(
    { classroomId: classroom._id, title: "Simulado Diagnostico LP 5o Ano - Demo" },
    {
      $set: {
        schoolId: school._id,
        classroomId: classroom._id,
        title: "Simulado Diagnostico LP 5o Ano - Demo",
        discipline: "LP",
        grade: "5",
        framework: "SAEB",
        examType: "SIMULADO",
        sourceType: "QUESTION_BANK",
        status: "READY",
        examCode,
        originalPdfFileId: null,
        omrTemplateVersion: 1,
        questionCount: questions.length,
        voidedQuestionIds: [],
        createdBy: admin._id,
        questions: examQuestions,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  const answerKeyItems = questions.map((question, index) => ({
    order: index + 1,
    questionId: new Types.ObjectId(String(question._id)),
    correctAnswer: question.answer,
    isVoided: false,
  }));

  await OfficialAnswerKeyModel.updateMany({ examId: exam._id }, { $set: { isActive: false } });
  const existingActiveKey = await OfficialAnswerKeyModel.findOne({ examId: exam._id, notes: "Seed demo" });
  const answerKey =
    existingActiveKey ??
    (await OfficialAnswerKeyModel.create({
      examId: exam._id,
      version: 1,
      publishedAt: new Date(),
      publishedBy: admin._id,
      isActive: true,
      notes: "Seed demo",
      items: answerKeyItems,
    }));

  await OfficialAnswerKeyModel.updateOne(
    { _id: answerKey._id },
    {
      $set: {
        isActive: true,
        publishedAt: new Date(),
        publishedBy: admin._id,
        items: answerKeyItems,
      },
    },
  );

  await ExamModel.updateOne(
    { _id: exam._id },
    {
      $set: {
        officialAnswerKeyId: answerKey._id,
        status: "READY",
      },
    },
  );

  const marksByStudent: Record<string, ("A" | "B" | "C" | "D")[]> = {
    "ALU-0001": ["B", "B", "A", "C", "A", "B"],
    "ALU-0002": ["B", "A", "A", "C", "D", "B"],
    "ALU-0003": ["D", "B", "C", "C", "A", "A"],
  };

  const answerSheets = [];
  for (const student of students) {
    const existingSheet = await AnswerSheetModel.findOne({
      examId: exam._id,
      studentId: student._id,
    });
    const sheetCode = existingSheet?.sheetCode ?? (await generateUniqueSheetCode());
    const qrPayload = JSON.stringify({
      sheetCode,
      examId: String(exam._id),
      studentId: String(student._id),
      examCode: exam.examCode,
      omrTemplateVersion: exam.omrTemplateVersion,
    });

    const answerSheet = await AnswerSheetModel.findOneAndUpdate(
      { examId: exam._id, studentId: student._id },
      {
        $set: {
          examId: exam._id,
          studentId: student._id,
          sheetCode,
          qrPayload,
          studentSnapshot: {
            fullName: student.fullName,
            registrationCode: student.registrationCode,
          },
          classroomSnapshot: {
            name: classroom.name,
            grade: classroom.grade,
          },
          schoolSnapshot: {
            name: school.name,
            city: school.city,
          },
          layout: {
            questionsPerPage: questions.length,
            totalQuestions: questions.length,
            optionsPerQuestion: 4,
            anchorSetVersion: exam.omrTemplateVersion,
          },
          status: "PROCESSED",
          generatedAt: new Date(),
          processedAt: new Date(),
          processingStatus: "DONE",
          pdfFileId: null,
          batchFileId: null,
          uploadUrl: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    answerSheets.push(answerSheet);
  }

  await ResultModel.deleteMany({
    answerSheetId: { $in: answerSheets.map((sheet) => sheet._id) },
  });

  const resultDocs = answerSheets.flatMap((sheet) => {
    const student = students.find((item) => String(item._id) === String(sheet.studentId));
    if (!student) return [];
    const marks = marksByStudent[student.registrationCode] ?? [];

    return questions.map((question, index) => {
      const markedAnswer = marks[index];
      const isCorrect = markedAnswer === question.answer;

      return {
        answerSheetId: sheet._id,
        examId: exam._id,
        studentId: student._id,
        questionId: question._id,
        order: index + 1,
        officialAnswer: question.answer,
        markedAnswer,
        isCorrect,
        score: isCorrect ? 1 : 0,
        correctionSource: "MANUAL" as const,
        answerSheetScanId: null,
        confidence: null,
      };
    });
  });

  if (resultDocs.length) {
    await ResultModel.insertMany(resultDocs);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseUrl: env.DATABASE_URL,
        users: {
          admin: admin.email,
          professor: professor.email,
          gestor: gestor.email,
          password: defaultPassword,
        },
        schoolId: String(school._id),
        classroomId: String(classroom._id),
        studentIds: students.map((student) => ({
          id: String(student._id),
          fullName: student.fullName,
          registrationCode: student.registrationCode,
        })),
        questionIds: questions.map((question) => String(question._id)),
        examId: String(exam._id),
        examCode: exam.examCode,
        answerSheetIds: answerSheets.map((sheet) => String(sheet._id)),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error("Falha ao executar seed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
