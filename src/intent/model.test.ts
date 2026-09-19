import { describe, expect, it } from 'vitest';
import { buildDemoPatternFrames } from './demoPattern';
import { classifySequence, classifySignFeatures, DEMO_MODEL_CARD } from './model';
import { INTENT_TEXTS, type IntentId } from './intents';

const featuresOf = (values: Partial<Record<string, number>>) => ({
  frames: 24,
  handsMean: 2,
  energy: 0,
  height: 0,
  spread: 0.4,
  endLift: 0,
  symmetry: 0,
  ...values,
});

describe('demo classifier stays honest and deterministic', () => {
  it('never guesses when there is no usable signal', () => {
    const result = classifySignFeatures(featuresOf({ handsMean: 0, spread: 0 }));
    expect(result.band).toBe('low');
    expect(result.confidence).toBe(0);
    expect(result.candidates).toEqual([]);
  });

  it('recognizes the exact demo pattern with high confidence and no other intent first', () => {
    const frames = buildDemoPatternFrames();
    const result = classifySequence(frames)!;
    expect(result).not.toBeNull();
    expect(result.band).toBe('high');
    expect(result.candidates[0].intentId).toBe('INT-01');
  });

  it('returns a maximum of three candidates sorted by confidence', () => {
    const near = {
      handsMean: 2, energy: 0.13, height: 0.34, spread: 0.49, endLift: 0.12, symmetry: 0,
    };
    const result = classifySignFeatures(featuresOf(near));
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    for (let index = 1; index < result.candidates.length; index += 1) {
      expect(result.candidates[index - 1].confidence).toBeGreaterThanOrEqual(result.candidates[index].confidence);
    }
  });

  it('stays low when the motion matches no prototype clearly', () => {
    const result = classifySignFeatures(featuresOf({
      handsMean: 0.8, energy: 0.85, height: -0.6, spread: 0.85, endLift: -0.35, symmetry: 0.7,
    }));
    expect(result.band).toBe('low');
  });

  it('produces an identical deterministic result for repeated input', () => {
    const frames = buildDemoPatternFrames();
    expect(classifySequence(frames)).toEqual(classifySequence(frames));
  });

  it('refuses classification for a sequence that is too short', () => {
    const short = buildDemoPatternFrames(3);
    expect(classifySequence(short)).toBeNull();
  });

  it('exposes the model provenance honestly', () => {
    const result = classifySequence(buildDemoPatternFrames())!;
    expect(result.modelId).toBe(DEMO_MODEL_CARD.modelId);
    expect(result.validated).toBe(false);
    expect(result.region).toBe('unassigned');
    expect(result.note).toContain('Belum ditinjau');
  });

  it('maps every PRD intent to its agreed output text', () => {
    expect(INTENT_TEXTS['INT-08']).toBe('Saya membutuhkan penerjemah BISINDO.');
    expect(INTENT_TEXTS['INT-10']).toBe('Terima kasih.');
    const ids = Object.keys(INTENT_TEXTS) as IntentId[];
    expect(ids).toHaveLength(10);
    for (const id of ids) expect(INTENT_TEXTS[id]).toBeTruthy();
  });
});