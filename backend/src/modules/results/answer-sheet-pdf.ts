import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { getOmrTemplateLayout, pointFromNormalized } from "./omr-template";

interface AnswerSheetPdfExamData {
  title: string;
  examCode: string;
}

interface AnswerSheetPdfSheetData {
  sheetCode: string;
  qrPayload: string;
  studentSnapshot: {
    fullName: string;
    registrationCode: string;
  };
  classroomSnapshot: {
    name: string;
    grade: "5" | "9";
  };
  schoolSnapshot: {
    name: string;
    city?: string;
  };
  layout: {
    totalQuestions: number;
    anchorSetVersion: number;
  };
}

function drawAnchorSquare(page: import("pdf-lib").PDFPage, x: number, y: number, size: number) {
  page.drawRectangle({
    x: x - size / 2,
    y: y - size / 2,
    width: size,
    height: size,
    color: rgb(0, 0, 0),
  });
}

export async function buildAnswerSheetsPdf(params: {
  exam: AnswerSheetPdfExamData;
  sheets: AnswerSheetPdfSheetData[];
}): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const sheet of params.sheets) {
    const page = pdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const layout = getOmrTemplateLayout(sheet.layout.totalQuestions, sheet.layout.anchorSetVersion);

    page.drawText(params.exam.title, {
      x: 40,
      y: height - 52,
      size: 16,
      font: boldFont,
    });

    const infoLines = [
      `Aluno: ${sheet.studentSnapshot.fullName}`,
      `Matricula: ${sheet.studentSnapshot.registrationCode}`,
      `Turma: ${sheet.classroomSnapshot.name} - ${sheet.classroomSnapshot.grade}o ano`,
      `Escola: ${sheet.schoolSnapshot.name}${sheet.schoolSnapshot.city ? ` / ${sheet.schoolSnapshot.city}` : ""}`,
      `Codigo da prova: ${params.exam.examCode}`,
      `Codigo do cartao: ${sheet.sheetCode}`,
    ];

    infoLines.forEach((line, index) => {
      page.drawText(line, {
        x: 40,
        y: height - 80 - index * 18,
        size: 10,
        font,
      });
    });

    page.drawText("Preencha apenas uma alternativa por questao. Marcas multiplas = N/A. Em branco = X.", {
      x: 40,
      y: height - 194,
      size: 9,
      font,
    });

    for (const point of Object.values(layout.anchors)) {
      const mapped = pointFromNormalized(width, height, point);
      drawAnchorSquare(page, mapped.x, height - mapped.y, 16);
    }

    for (const point of layout.timingMarks) {
      const mapped = pointFromNormalized(width, height, point);
      page.drawRectangle({
        x: mapped.x - 3,
        y: height - mapped.y - 3,
        width: 6,
        height: 6,
        color: rgb(0, 0, 0),
      });
    }

    const qrDataUrl = await QRCode.toDataURL(sheet.qrPayload, {
      errorCorrectionLevel: "M",
      margin: 0,
      width: 160,
    });
    const qrImage = await pdf.embedPng(qrDataUrl);
    page.drawImage(qrImage, {
      x: width - 120,
      y: height - 160,
      width: 80,
      height: 80,
    });

    const uniqueRows = new Map(layout.rows.map((row) => [row.order, row]));
    for (const row of uniqueRows.values()) {
      const y = height - row.y * height;
      const firstBubble = layout.bubbles.find((bubble) => bubble.order === row.order);
      if (!firstBubble) continue;

      page.drawText(String(row.order).padStart(2, "0"), {
        x: firstBubble.x * width - 42,
        y: y - 5,
        size: 10,
        font: boldFont,
      });
    }

    for (const bubble of layout.bubbles) {
      const x = bubble.x * width;
      const y = height - bubble.y * height;

      page.drawCircle({
        x,
        y,
        size: bubble.radius * width,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1.3,
      });

      page.drawText(bubble.option, {
        x: x - 3.2,
        y: y + 12,
        size: 8,
        font,
      });
    }
  }

  return Buffer.from(await pdf.save());
}
