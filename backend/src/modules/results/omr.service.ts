const Jimp = require("jimp");

import { getOmrTemplateLayout } from "./omr-template";

type DetectedAnswer = "A" | "B" | "C" | "D" | "X" | "N/A";
type DetectionReason = "SINGLE_MARK" | "MULTIPLE_MARKS" | "BLANK" | "LOW_CONFIDENCE";

interface AnchorCandidate {
  x: number;
  y: number;
  darkness: number;
}

function getPixelDarkness(image: any, x: number, y: number): number {
  const rgba = Jimp.intToRGBA(image.getPixelColor(x, y));
  const brightness = (rgba.r + rgba.g + rgba.b) / 3;
  return 1 - brightness / 255;
}

function measureWindowDarkness(image: any, x: number, y: number, size: number): number {
  let total = 0;
  let count = 0;
  const maxX = Math.min(image.bitmap.width, x + size);
  const maxY = Math.min(image.bitmap.height, y + size);

  for (let yy = Math.max(0, y); yy < maxY; yy += 2) {
    for (let xx = Math.max(0, x); xx < maxX; xx += 2) {
      total += getPixelDarkness(image, xx, yy);
      count += 1;
    }
  }

  return count === 0 ? 0 : total / count;
}

function findDarkestWindow(
  image: any,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  windowSize: number,
): AnchorCandidate {
  let best: AnchorCandidate = { x: x0, y: y0, darkness: -1 };

  for (let y = y0; y <= y1 - windowSize; y += 4) {
    for (let x = x0; x <= x1 - windowSize; x += 4) {
      const darkness = measureWindowDarkness(image, x, y, windowSize);
      if (darkness > best.darkness) {
        best = { x: x + windowSize / 2, y: y + windowSize / 2, darkness };
      }
    }
  }

  return best;
}

function detectAnchors(image: any) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const regionW = Math.floor(width * 0.2);
  const regionH = Math.floor(height * 0.2);
  const windowSize = Math.max(18, Math.floor(Math.min(width, height) * 0.028));

  const topLeft = findDarkestWindow(image, 0, 0, regionW, regionH, windowSize);
  const topRight = findDarkestWindow(image, width - regionW, 0, width, regionH, windowSize);
  const bottomLeft = findDarkestWindow(image, 0, height - regionH, regionW, height, windowSize);
  const bottomRight = findDarkestWindow(image, width - regionW, height - regionH, width, height, windowSize);

  const alignmentScore =
    (topLeft.darkness + topRight.darkness + bottomLeft.darkness + bottomRight.darkness) / 4;

  return { topLeft, topRight, bottomLeft, bottomRight, alignmentScore };
}

function mapNormalizedToQuadrilateral(
  x: number,
  y: number,
  anchors: ReturnType<typeof detectAnchors>,
): { x: number; y: number } {
  const topX = anchors.topLeft.x + (anchors.topRight.x - anchors.topLeft.x) * x;
  const topY = anchors.topLeft.y + (anchors.topRight.y - anchors.topLeft.y) * x;
  const bottomX = anchors.bottomLeft.x + (anchors.bottomRight.x - anchors.bottomLeft.x) * x;
  const bottomY = anchors.bottomLeft.y + (anchors.bottomRight.y - anchors.bottomLeft.y) * x;

  return {
    x: topX + (bottomX - topX) * y,
    y: topY + (bottomY - topY) * y,
  };
}

function sampleCircleFill(image: any, cx: number, cy: number, radius: number): number {
  let total = 0;
  let dark = 0;

  for (let y = Math.floor(cy - radius); y <= Math.ceil(cy + radius); y += 1) {
    for (let x = Math.floor(cx - radius); x <= Math.ceil(cx + radius); x += 1) {
      if (x < 0 || y < 0 || x >= image.bitmap.width || y >= image.bitmap.height) {
        continue;
      }

      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy > radius * radius) {
        continue;
      }

      total += 1;
      if (getPixelDarkness(image, x, y) >= 0.45) {
        dark += 1;
      }
    }
  }

  return total === 0 ? 0 : dark / total;
}

function decideAnswer(fills: Array<{ option: "A" | "B" | "C" | "D"; fill: number }>): {
  detectedAnswer: DetectedAnswer;
  confidence: number;
  reason: DetectionReason;
} {
  const sorted = [...fills].sort((a, b) => b.fill - a.fill);
  const best = sorted[0];
  const second = sorted[1];

  if (!best || best.fill < 0.16) {
    return { detectedAnswer: "X", confidence: 1 - (best?.fill ?? 0), reason: "BLANK" };
  }

  if (best.fill >= 0.18 && second && second.fill >= 0.18) {
    return {
      detectedAnswer: "N/A",
      confidence: Math.min(1, (best.fill + second.fill) / 2),
      reason: "MULTIPLE_MARKS",
    };
  }

  const confidence = Math.max(0, Math.min(1, best.fill - (second?.fill ?? 0)));
  if (confidence < 0.05) {
    return { detectedAnswer: "N/A", confidence, reason: "LOW_CONFIDENCE" };
  }

  return { detectedAnswer: best.option, confidence, reason: "SINGLE_MARK" };
}

async function pickBestRotation(original: any) {
  const angles = [-6, -3, 0, 3, 6];
  let bestImage = original;
  let bestAngle = 0;
  let bestAnchors = detectAnchors(original);

  for (const angle of angles) {
    const candidate = original.clone().rotate(angle, false);
    candidate.grayscale().contrast(0.4);
    const anchors = detectAnchors(candidate);

    if (anchors.alignmentScore > bestAnchors.alignmentScore) {
      bestImage = candidate;
      bestAngle = angle;
      bestAnchors = anchors;
    }
  }

  return { image: bestImage, angle: bestAngle, anchors: bestAnchors };
}

export async function runOmrOnImage(params: {
  absolutePath: string;
  totalQuestions: number;
  anchorSetVersion: number;
}): Promise<{
  parsedMarks: Array<{
    order: number;
    detectedAnswer: DetectedAnswer;
    confidence: number;
    reason: DetectionReason;
  }>;
  omrMetrics: {
    rotationDegrees: number;
    alignmentScore: number;
    shadowScore: number;
    detectedAnchors: number;
    confidence: number;
  };
}> {
  const original = await Jimp.read(params.absolutePath);
  original.grayscale().contrast(0.45);

  const { image, angle, anchors } = await pickBestRotation(original);
  const template = getOmrTemplateLayout(params.totalQuestions, params.anchorSetVersion);

  const parsedMarks = template.rows.map((row) => {
    const rowBubbles = template.bubbles.filter((bubble) => bubble.order === row.order);
    const fills = rowBubbles.map((bubble) => {
      const point = mapNormalizedToQuadrilateral(bubble.x, bubble.y, anchors);
      const radius = bubble.radius * image.bitmap.width;
      const fill = sampleCircleFill(image, point.x, point.y, radius);
      return { option: bubble.option, fill };
    });

    const detection = decideAnswer(fills);
    return {
      order: row.order,
      detectedAnswer: detection.detectedAnswer,
      confidence: detection.confidence,
      reason: detection.reason,
    };
  });

  const averageConfidence =
    parsedMarks.length === 0
      ? 0
      : parsedMarks.reduce((acc, item) => acc + item.confidence, 0) / parsedMarks.length;

  const shadowScore = 1 - measureWindowDarkness(image, 0, 0, Math.min(image.bitmap.width, image.bitmap.height));

  return {
    parsedMarks,
    omrMetrics: {
      rotationDegrees: angle,
      alignmentScore: Math.max(0, Math.min(1, anchors.alignmentScore)),
      shadowScore: Math.max(0, Math.min(1, shadowScore)),
      detectedAnchors: 4,
      confidence: Math.max(0, Math.min(1, averageConfidence)),
    },
  };
}
