interface OmrAnchorPoint {
  x: number;
  y: number;
}

interface OmrBubblePosition {
  order: number;
  option: "A" | "B" | "C" | "D";
  x: number;
  y: number;
  radius: number;
}

interface OmrQuestionRow {
  order: number;
  y: number;
}

export interface OmrTemplateLayout {
  totalQuestions: number;
  questionsPerPage: number;
  optionsPerQuestion: 4;
  anchorSetVersion: number;
  anchors: {
    topLeft: OmrAnchorPoint;
    topRight: OmrAnchorPoint;
    bottomLeft: OmrAnchorPoint;
    bottomRight: OmrAnchorPoint;
  };
  rows: OmrQuestionRow[];
  bubbles: OmrBubblePosition[];
  timingMarks: OmrAnchorPoint[];
}

const MAX_ROWS_PER_COLUMN = 20;
const COLUMN_X = [0.19, 0.56];
const OPTION_SPACING = 0.055;
const BUBBLE_START_X = 0.28;
const BUBBLE_RADIUS = 0.014;
const TOP_Y = 0.27;
const BOTTOM_Y = 0.86;

export function getOmrTemplateLayout(totalQuestions: number, anchorSetVersion = 1): OmrTemplateLayout {
  if (totalQuestions < 1) {
    throw new Error("A prova precisa ter ao menos 1 questao.");
  }

  if (totalQuestions > MAX_ROWS_PER_COLUMN * 2) {
    throw new Error("O MVP OMR atual suporta ate 40 questoes por cartao.");
  }

  const columns = totalQuestions > MAX_ROWS_PER_COLUMN ? 2 : 1;
  const rowsPerColumn = Math.ceil(totalQuestions / columns);
  const stepY = rowsPerColumn === 1 ? 0 : (BOTTOM_Y - TOP_Y) / (rowsPerColumn - 1);

  const rows: OmrQuestionRow[] = [];
  const bubbles: OmrBubblePosition[] = [];
  const timingMarks: OmrAnchorPoint[] = [];

  for (let order = 1; order <= totalQuestions; order += 1) {
    const zeroBased = order - 1;
    const columnIndex = Math.floor(zeroBased / MAX_ROWS_PER_COLUMN);
    const rowIndex = zeroBased % MAX_ROWS_PER_COLUMN;
    const y = TOP_Y + rowIndex * stepY;
    const xBase = COLUMN_X[columnIndex];

    rows.push({ order, y });

    (["A", "B", "C", "D"] as const).forEach((option, optionIndex) => {
      bubbles.push({
        order,
        option,
        x: xBase + BUBBLE_START_X + optionIndex * OPTION_SPACING,
        y,
        radius: BUBBLE_RADIUS,
      });
    });

    timingMarks.push({ x: 0.07, y });
    timingMarks.push({ x: 0.93, y });
  }

  return {
    totalQuestions,
    questionsPerPage: totalQuestions,
    optionsPerQuestion: 4,
    anchorSetVersion,
    anchors: {
      topLeft: { x: 0.05, y: 0.05 },
      topRight: { x: 0.95, y: 0.05 },
      bottomLeft: { x: 0.05, y: 0.95 },
      bottomRight: { x: 0.95, y: 0.95 },
    },
    rows,
    bubbles,
    timingMarks,
  };
}

export function pointFromNormalized(width: number, height: number, point: OmrAnchorPoint): OmrAnchorPoint {
  return { x: point.x * width, y: point.y * height };
}
