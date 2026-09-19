import { describe, expect, it } from 'vitest';
import { extractFeatures, MIN_FEATURE_FRAMES } from './features';
import type { LandmarkFrame, Point } from '../vision/protocol';

const point = (overrides: Partial<Point> = {}): Point => ({ x: 0.5, y: 0.5, z: 0, visibility: 1, ...overrides });
const points = (count: number, factory: (index: number) => Point = () => point()) =>
  Array.from({ length: count }, (_, index) => factory(index));

function shoulders(pose: Point[]) {
  pose[11] = point({ x: 0.32, y: 0.5 });
  pose[12] = point({ x: 0.68, y: 0.5 });
}

function staticFrame(timestampMs = 0): LandmarkFrame {
  const pose = points(33);
  shoulders(pose);
  return {
    timestampMs,
    pose,
    leftHand: points(21),
    rightHand: points(21),
    face: [],
  };
}

function raisedHandsFrame(timestampMs: number, handY: number): LandmarkFrame {
  const pose = points(33);
  shoulders(pose);
  return {
    timestampMs,
    pose,
    leftHand: points(21, () => point({ x: 0.45, y: handY })),
    rightHand: points(21, () => point({ x: 0.55, y: handY })),
    face: [],
  };
}

describe('feature extraction reports only what it observed', () => {
  it('returns null when there are too few observed frames', () => {
    const frames = [staticFrame(0)];
    for (let index = 1; index < MIN_FEATURE_FRAMES; index += 1) frames.push(staticFrame(index * 100));
    expect(extractFeatures([])).toBeNull();
  });

  it('returns zero signal for perfectly still, spread-less hands', () => {
    const frames = Array.from({ length: 12 }, (_, index) => staticFrame(index * 100));
    const features = extractFeatures(frames)!;
    expect(features).not.toBeNull();
    expect(features.handsMean).toBe(2);
    expect(features.energy).toBeLessThan(0.001);
    expect(features.spread).toBeLessThan(0.001);
    expect(Math.abs(features.height)).toBeLessThan(0.001);
  });

  it('detects raised hands as positive height and motion between frames', () => {
    const frames = Array.from({ length: 12 }, (_, index) =>
      raisedHandsFrame(index * 100, 0.42 - index * 0.005));
    const features = extractFeatures(frames)!;
    expect(features.height).toBeGreaterThan(0.15);
    expect(features.energy).toBeGreaterThan(0.01);
  });

  it('records openness when fingertips are far from the wrist', () => {
    const pose = points(33);
    shoulders(pose);
    const leftHand = points(21);
    leftHand[0] = point({ x: 0.42, y: 0.5 });
    leftHand[8] = point({ x: 0.54, y: 0.44 });
    leftHand[12] = point({ x: 0.56, y: 0.5 });
    const frames = Array.from({ length: 12 }, (_, index) => ({
      timestampMs: index * 100, pose, leftHand, rightHand: points(21), face: [] as Point[],
    }));
    const features = extractFeatures(frames)!;
    expect(features.spread).toBeGreaterThan(0.3);
  });
});