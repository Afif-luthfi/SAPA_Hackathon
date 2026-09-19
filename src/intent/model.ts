import { extractFeatures, FEATURE_KEYS, type SignFeatures } from './features';
import { confidenceBand, type ConfidenceBand } from './policy';
import { INTENT_IDS, INTENT_TEXTS, type IntentId } from './intents';
import type { LandmarkFrame } from '../vision/protocol';

export interface RecognitionCandidate {
  intentId: IntentId;
  confidence: number;
}

export interface RecognitionResult {
  modelId: string;
  modelVersion: string;
  region: string;
  validated: boolean;
  confidence: number;
  band: ConfidenceBand;
  candidates: RecognitionCandidate[];
  note: string;
}

export const DEMO_MODEL_CARD = {
  modelId: 'sapa-demo-handcraft-v1',
  version: '0.1.0-demo',
  region: 'unassigned',
  validated: false,
  reviewer: null,
  intentCount: INTENT_IDS.length,
  note: 'Klasifikasi contoh berbasis aturan untuk menguji alur aplikasi. Bukan model BISINDO, belum ditinjau penutur BISINDO, dan tidak memproses video di luar perangkat.',
};

const RANGES: Record<(typeof FEATURE_KEYS)[number], number> = {
  handsMean: 2,
  energy: 1,
  height: 2,
  spread: 1,
  endLift: 1,
  symmetry: 1,
};

const WEIGHTS: Record<(typeof FEATURE_KEYS)[number], number> = {
  handsMean: 0.30,
  energy: 0.10,
  height: 0.25,
  spread: 0.20,
  endLift: 0.10,
  symmetry: 0.05,
};

type Prototype = Record<(typeof FEATURE_KEYS)[number], number>;

export const PROTOTYPES: Record<IntentId, Prototype> = {
  'INT-01': { handsMean: 2, energy: 0.13, height: 0.35, spread: 0.5, endLift: 0.13, symmetry: 0 },
  'INT-02': { handsMean: 1, energy: 0.22, height: 0.15, spread: 0.4, endLift: -0.08, symmetry: 0 },
  'INT-03': { handsMean: 2, energy: 0.3, height: -0.1, spread: 0.5, endLift: 0.05, symmetry: 0.1 },
  'INT-04': { handsMean: 1, energy: 0.28, height: 0.5, spread: 0.3, endLift: 0.12, symmetry: 0 },
  'INT-05': { handsMean: 1, energy: 0.38, height: 0, spread: 0.65, endLift: 0.2, symmetry: 0 },
  'INT-06': { handsMean: 1, energy: 0.32, height: -0.25, spread: 0.45, endLift: -0.05, symmetry: 0 },
  'INT-07': { handsMean: 2, energy: 0.55, height: 0.1, spread: 0.75, endLift: -0.3, symmetry: 0.2 },
  'INT-08': { handsMean: 2, energy: 0.06, height: 0.8, spread: 0.9, endLift: 0.35, symmetry: 0 },
  'INT-09': { handsMean: 1, energy: 0.22, height: -0.35, spread: 0.35, endLift: 0, symmetry: 0 },
  'INT-10': { handsMean: 2, energy: 0.1, height: -0.05, spread: 0.38, endLift: -0.12, symmetry: 0.05 },
};

function hasSignal(features: SignFeatures): boolean {
  if (features.handsMean < 0.3) return false;
  return features.energy > 0.02
    || features.spread > 0.03
    || Math.abs(features.height) > 0.05
    || Math.abs(features.endLift) > 0.02;
}

function similarity(observed: SignFeatures, prototype: Prototype): number {
  let squared = 0;
  for (const key of FEATURE_KEYS) {
    const difference = (observed[key] - prototype[key]) / RANGES[key];
    squared += WEIGHTS[key] * difference * difference;
  }
  return Math.min(1, Math.max(0, 1 - Math.sqrt(squared)));
}

function normalizedConfidence(similarity: number): number {
  return Math.min(1, Math.max(0, (similarity - 0.62) / 0.36));
}

export function classifySequence(frames: LandmarkFrame[]): RecognitionResult | null {
  const features = extractFeatures(frames);
  if (!features) return null;
  return classifySignFeatures(features);
}

export function classifySignFeatures(features: SignFeatures): RecognitionResult {
  if (!hasSignal(features)) {
    return {
      modelId: DEMO_MODEL_CARD.modelId,
      modelVersion: DEMO_MODEL_CARD.version,
      region: DEMO_MODEL_CARD.region,
      validated: DEMO_MODEL_CARD.validated,
      confidence: 0,
      band: 'low',
      candidates: [],
      note: 'Tidak ada sinyal gerakan yang cukup untuk menilai isyarat.',
    };
  }

  const scored = INTENT_IDS
    .map(intentId => ({ intentId, similarity: similarity(features, PROTOTYPES[intentId]) }))
    .sort((a, b) => b.similarity - a.similarity);

  const confidence = normalizedConfidence(scored[0].similarity);

  const candidates: RecognitionCandidate[] = scored.slice(0, 3).map(candidate => ({
    intentId: candidate.intentId,
    confidence: Math.round(100 * candidate.similarity) / 100,
  }));

  return {
    modelId: DEMO_MODEL_CARD.modelId,
    modelVersion: DEMO_MODEL_CARD.version,
    region: DEMO_MODEL_CARD.region,
    validated: DEMO_MODEL_CARD.validated,
    confidence: Math.round(1000 * confidence) / 1000,
    band: confidenceBand(confidence),
    candidates,
    note: 'Contoh teknis untuk menguji alur. Belum ditinjau penutur BISINDO.',
  };
}

export function intentText(intentId: IntentId): string {
  return INTENT_TEXTS[intentId];
}