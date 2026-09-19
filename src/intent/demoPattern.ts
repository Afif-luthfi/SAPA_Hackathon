import type { LandmarkFrame, Point } from '../vision/protocol';

// A documented, synthetic "demo pattern" used to exercise the recognition UI.
// It is NOT a BISINDO gesture and must never be presented as one.

const FRAME_COUNT = 24;

function point(x: number, y: number): Point {
  return { x, y, z: 0, visibility: 1 };
}

function hand(wristX: number, wristY: number, spread: number): Point[] {
  const points: Point[] = [];
  const angles = [0.45, 0.95, 1.55, 2.35, 2.85];
  const tips = [4, 8, 12, 16, 20];
  for (let index = 0; index < 21; index += 1) {
    if (tips.includes(index)) {
      const angle = angles[tips.indexOf(index)];
      points.push(point(wristX + Math.cos(angle) * spread, wristY + Math.sin(angle) * spread));
    } else {
      points.push(point(wristX, wristY));
    }
  }
  return points;
}

export function buildDemoPatternFrames(count = FRAME_COUNT): LandmarkFrame[] {
  const frames: LandmarkFrame[] = [];
  for (let index = 0; index < count; index += 1) {
    const progress = index / Math.max(1, count - 1);
    const width = 0.36;
    const leftX = 0.5 - width / 2;
    const rightX = 0.5 + width / 2;
    const sweep = progress * 0.24;
    const handY = 0.37 - progress * 0.05;
    const shoulderY = 0.5;
    const pose = Array.from({ length: 33 }, (_, pointIndex) =>
      pointIndex === 11 ? point(leftX, shoulderY)
        : pointIndex === 12 ? point(rightX, shoulderY)
        : point(0.5, 0.5));
    frames.push({
      timestampMs: Math.round(index * 1000 / 6),
      pose,
      leftHand: hand(leftX - 0.04 + sweep, handY, 0.11),
      rightHand: hand(rightX + 0.04 + sweep, handY, 0.11),
      face: [],
    });
  }
  return frames;
}