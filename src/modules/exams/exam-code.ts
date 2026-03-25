import { ExamModel } from "./exam.model";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function generateUniqueExamCode(length = 8): Promise<string> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    let code = "";
    for (let i = 0; i < length; i += 1) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }
    const exists = await ExamModel.exists({ examCode: code });
    if (!exists) return code;
  }
  throw new Error("Nao foi possivel gerar codigo unico para a prova.");
}
