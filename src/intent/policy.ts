export type ConfidenceBand = 'high' | 'uncertain' | 'low';

export const HIGH_THRESHOLD = 0.85;
export const LOW_THRESHOLD = 0.60;

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= HIGH_THRESHOLD) return 'high';
  if (confidence >= LOW_THRESHOLD) return 'uncertain';
  return 'low';
}

export const BAND_LABELS: Record<ConfidenceBand, string> = {
  high: 'Yakin',
  uncertain: 'Perlu dipilih',
  low: 'Belum dikenali',
};

export function bandLabel(band: ConfidenceBand): string {
  return BAND_LABELS[band];
}