import { describe, expect, it } from 'vitest';
import { sha256OfText, verdictFromVerification } from './pack';
import type { LocalVerification } from './registry';
import { demoRegistryState, LANGUAGE_PACK } from './demoPack';
import { verifyLocalPack } from './registry';

const HASHES = {
  dataset: LANGUAGE_PACK.dataset.sha256,
  model: LANGUAGE_PACK.model.sha256,
  intentSchema: LANGUAGE_PACK.intentSchema.sha256,
};

describe('sha256OfText', () => {
  it('menghitung vektor SHA-256 yang dikenal', async () => {
    expect(await sha256OfText('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('deterministik', async () => {
    expect(await sha256OfText('sapa')).toBe(await sha256OfText('sapa'));
  });
});

describe('verdictFromVerification', () => {
  const base = (over: Partial<Omit<LocalVerification, 'accepted'>>): LocalVerification => ({
    packId: LANGUAGE_PACK.packId, known: true, status: 'Active', hashMatches: true,
    accepted: true, ...over,
  });

  it('verified saat Active dan cocok', () => {
    expect(verdictFromVerification(base({}))).toEqual({ state: 'verified' });
  });
  it('pending saat belum disetujui', () => {
    expect(verdictFromVerification(base({ status: 'Proposed' }))).toEqual({ state: 'pending' });
  });
  it('blokir sebab hash berubah/deprecated/not-listed', () => {
    expect(verdictFromVerification(base({ hashMatches: false }))).toEqual({ state: 'blocked', reason: 'hash-mismatch' });
    expect(verdictFromVerification(base({ status: 'Deprecated' }))).toEqual({ state: 'blocked', reason: 'deprecated' });
    expect(verdictFromVerification(base({ status: 'Superseded' }))).toEqual({ state: 'blocked', reason: 'deprecated' });
    expect(verdictFromVerification(base({ known: false, status: 'Unknown', hashMatches: false }))).toEqual({ state: 'blocked', reason: 'not-listed' });
  });
});

describe('pack contoh (demo)', () => {
  it('pack defaults terverifikasi untuk kiosk', () => {
    const verdict = verdictFromVerification(verifyLocalPack(demoRegistryState(), LANGUAGE_PACK.packId, HASHES));
    expect(verdict).toEqual({ state: 'verified' });
  });
});