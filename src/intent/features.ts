import type { LandmarkFrame, Point } from '../vision/protocol';

export const MIN_FEATURE_FRAMES = 6;
export const TARGET_FEATURE_FRAMES = 24;

export interface SignFeatures {
  frames: number;
  handsMean: number;
  energy: number;
  height: number;
  spread: number;
  endLift: number;
  symmetry: number;
}

export const FEATURE_KEYS = [
  'handsMean', 'energy', 'height', 'spread', 'endLift', 'symmetry',
] as const;

function visible(point: Point | undefined): point is Point {
  return !!point && [point.x, point.y, point.z].every(Number.isFinite)
    && (point.visibility === undefined || point.visibility >= 0.5);
}

function shoulderReference(frame: LandmarkFrame): { ox: number; oy: number; scale: number } | null {
  const left = frame.pose[11];
  const right = frame.pose[12];
  if (!visible(left) || !visible(right)) return null;
  const width = Math.hypot(right.x - left.x, right.y - left.y);
  const scale = Math.max(width * 1.1, 0.16);
  return {
    ox: (left.x + right.x) / 2,
    oy: (left.y + right.y) / 2,
    scale,
  };
}

interface HandObservation {
  x: number;
  y: number;
  spread: number;
}

interface FrameObservation {
  hands: HandObservation[];
}

function observeHand(points: Point[], ref: { ox: number; oy: number; scale: number }): HandObservation | null {
  const usable = points.filter(visible);
  if (usable.length < 4) return null;
  const cx = usable.reduce((sum, p) => sum + p.x, 0) / usable.length;
  const cy = usable.reduce((sum, p) => sum + p.y, 0) / usable.length;
  const wristPoint = visible(points[0]) ? points[0] : null;
  const fingertipIndices = [8, 12];
  const fingertips = fingertipIndices
    .map(index => points[index])
    .filter(visible);
  let spread = 0;
  if (wristPoint && fingertips.length > 0) {
    const distances = fingertips
      .map(finger => Math.hypot(finger.x - wristPoint.x, finger.y - wristPoint.y))
      .filter(value => Number.isFinite(value));
    if (distances.length > 0) {
      const average = distances.reduce((sum, value) => sum + value, 0) / distances.length;
      spread = Math.min(1, average / ref.scale / 0.55);
    }
  }
  // Normalized coordinates relative to shoulder midpoint; raised hands get negative y.
  return {
    x: (cx - ref.ox) / ref.scale,
    y: (cy - ref.oy) / ref.scale,
    spread,
  };
}

function observe(frame: LandmarkFrame): FrameObservation | null {
  const ref = shoulderReference(frame);
  if (!ref) return null;
  const hands = [frame.leftHand, frame.rightHand]
    .map(points => observeHand(points, ref))
    .filter((hand): hand is HandObservation => hand !== null);
  return { hands };
}

function resample(points: FrameObservation[], target: number): FrameObservation[] {
  if (points.length === 0) return [];
  if (points.length === 1) return Array.from({ length: target }, () => points[0]);
  const result: FrameObservation[] = [];
  for (let index = 0; index < target; index += 1) {
    const position = (index * (points.length - 1)) / Math.max(1, target - 1);
    const lower = Math.floor(position);
    const upper = Math.min(points.length - 1, Math.ceil(position));
    result.push(position - lower > upper - position ? points[upper] : points[lower]);
  }
  return result;
}

export function extractFeatures(frames: LandmarkFrame[]): SignFeatures | null {
  const ordered = [...frames].sort((a, b) => a.timestampMs - b.timestampMs);
  const observed = ordered.map(observe).filter((item): item is FrameObservation => item !== null);
  if (observed.length < MIN_FEATURE_FRAMES) return null;
  const timeline = resample(observed, TARGET_FEATURE_FRAMES);

  const handCounts = timeline.map(item => item.hands.length);
  const handsMean = handCounts.reduce((sum, count) => sum + count, 0) / timeline.length;

  const perFrameHeights = timeline.map(item =>
    item.hands.length === 0 ? null : item.hands.reduce((sum, hand) => sum - hand.y, 0) / item.hands.length);
  const heights = perFrameHeights.filter((value): value is number => value !== null);
  const height = heights.length === 0 ? 0 : heights.reduce((sum, value) => sum + value, 0) / heights.length;

  const spreads = timeline.flatMap(item => item.hands.map(hand => hand.spread));
  const spread = spreads.length === 0 ? 0 : spreads.reduce((sum, value) => sum + value, 0) / spreads.length;

  const firstQuarter = Math.floor(timeline.length / 4);
  const lastQuarter = Math.ceil((3 * timeline.length) / 4);
  const startSum = firstQuarter < lastQuarter ? partialHeight(timeline, 0, firstQuarter) : null;
  const endSum = partialHeight(timeline, lastQuarter, timeline.length);
  const endLift = startSum !== null ? endSum - startSum : 0;

  const symmetryMean = timeline.reduce((sum, item) => {
    if (item.hands.length < 2) return sum;
    return sum + Math.abs(item.hands[0].y - item.hands[1].y);
  }, 0);
  const bothHandFrames = timeline.filter(item => item.hands.length >= 2).length;
  const symmetry = bothHandFrames === 0 ? 0 : symmetryMean / bothHandFrames;

  let deltaSum = 0;
  let pairCount = 0;
  for (let index = 1; index < timeline.length; index += 1) {
    const previous = timeline[index - 1];
    const current = timeline[index];
    if (previous.hands.length === 0 || current.hands.length === 0) continue;
    const pairs = Math.min(previous.hands.length, current.hands.length);
    let frameDelta = 0;
    for (let handIndex = 0; handIndex < pairs; handIndex += 1) {
      frameDelta += Math.hypot(
        current.hands[handIndex].x - previous.hands[handIndex].x,
        current.hands[handIndex].y - previous.hands[handIndex].y,
      );
    }
    deltaSum += frameDelta / pairs;
    pairCount += 1;
  }
  const energy = pairCount === 0 ? 0 : Math.min(1, deltaSum / pairCount / 0.2);

  return {
    frames: timeline.length,
    handsMean,
    energy,
    height,
    spread,
    endLift,
    symmetry: Math.min(1, symmetry),
  };
}

function partialHeight(timeline: FrameObservation[], from: number, to: number): number {
  const values: number[] = [];
  for (let index = from; index < to; index += 1) {
    const item = timeline[index];
    if (item.hands.length > 0) {
      values.push(item.hands.reduce((sum, hand) => sum - hand.y, 0) / item.hands.length);
    }
  }
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}