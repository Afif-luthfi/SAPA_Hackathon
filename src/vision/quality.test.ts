import { describe, expect, it } from 'vitest';
import { assessFrame } from './quality';
import type { LandmarkFrame, Point } from './protocol';

const point = (overrides: Partial<Point> = {}): Point => ({ x: 0.5, y: 0.5, z: 0, visibility: 1, ...overrides });
const points = (count: number) => Array.from({ length: count }, () => point());
const frame = (overrides: Partial<LandmarkFrame> = {}): LandmarkFrame => ({
  timestampMs: 1, pose: [], leftHand: [], rightHand: [], face: [], ...overrides,
});

describe('position guidance uses observations, not sign predictions', () => {
  it('asks for upper body when nothing is detected', () => {
    expect(assessFrame(frame())).toMatchObject({ handCount: 0, upperBodyVisible: false, tone: 'waiting', pointCount: 0 });
  });
  it('does not accept occluded shoulders as visible', () => {
    const pose = points(33);
    pose[12].visibility = 0.1;
    expect(assessFrame(frame({ pose, leftHand: points(21) })).upperBodyVisible).toBe(false);
  });
  it('asks for hands when shoulders are visible', () => {
    expect(assessFrame(frame({ pose: points(33) }))).toMatchObject({ handCount: 0, upperBodyVisible: true, tone: 'adjust' });
  });
  it('allows one visible hand without claiming the gesture needs two', () => {
    expect(assessFrame(frame({ pose: points(33), leftHand: points(21) }))).toMatchObject({ handCount: 1, tone: 'ready' });
  });
  it('warns about fingers near the edge even with both hands', () => {
    const rightHand = points(21);
    rightHand[8].x = 0.99;
    expect(assessFrame(frame({ pose: points(33), leftHand: points(21), rightHand }))).toMatchObject({ handCount: 2, tone: 'adjust' });
  });
  it('reports all observed landmarks without a translation confidence', () => {
    expect(assessFrame(frame({ pose: points(33), leftHand: points(21), rightHand: points(21), face: points(478) }))).toMatchObject({ tone: 'ready', pointCount: 553, faceVisible: true });
  });
  it('rejects malformed or nonfinite hand points', () => {
    const leftHand = points(21);
    leftHand[2].x = Number.NaN;
    expect(assessFrame(frame({ pose: points(33), leftHand, rightHand: points(20) })).handCount).toBe(0);
  });
});
