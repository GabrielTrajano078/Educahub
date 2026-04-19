import { AnswerSheetModel } from "./answer-sheet.model";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function generateUniqueSheetCode(length = 10): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let code = "";
    for (let i = 0; i < length; i += 1) {
      code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    }

    const exists = await AnswerSheetModel.exists({ sheetCode: code });
    if (!exists) return code;
  }

  throw new Error("Nao foi possivel gerar codigo unico para o cartao-resposta.");
}
