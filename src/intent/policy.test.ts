import { describe, expect, it } from 'vitest';
import { bandLabel, confidenceBand, HIGH_THRESHOLD, LOW_THRESHOLD } from './policy';

describe('confidence band follows the PRD thresholds', () => {
  it('is high at and above 0.85', () => {
    expect(confidenceBand(HIGH_THRESHOLD)).toBe('high');
    expect(confidenceBand(0.9)).toBe('high');
    expect(confidenceBand(1)).toBe('high');
  });

  it('is uncertain between 0.60 and below 0.85', () => {
    expect(confidenceBand(LOW_THRESHOLD)).toBe('uncertain');
    expect(confidenceBand(0.84)).toBe('uncertain');
    expect(confidenceBand(0.72)).toBe('uncertain');
  });

  it('is low below 0.60', () => {
    expect(confidenceBand(0.59)).toBe('low');
    expect(confidenceBand(0)).toBe('low');
  });

  it('exposes simple Indonesian labels, not only numbers', () => {
    expect(bandLabel('high')).toBe('Yakin');
    expect(bandLabel('uncertain')).toBe('Perlu dipilih');
    expect(bandLabel('low')).toBe('Belum dikenali');
  });
});