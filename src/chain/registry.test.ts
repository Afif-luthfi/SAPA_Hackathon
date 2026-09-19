import { describe, expect, it } from 'vitest';
import {
  approveDeprecation, approvePack, createRegistry, getActivePack, getPack,
  isValidator, proposeDeprecation, submitPack, verifyLocalPack,
} from './registry';
import { DEMO_REGION, DEMO_VALIDATORS, demoRegistryState, LANGUAGE_PACK } from './demoPack';

const HASHES = {
  dataset: LANGUAGE_PACK.dataset.sha256,
  model: LANGUAGE_PACK.model.sha256,
  intentSchema: LANGUAGE_PACK.intentSchema.sha256,
};
const [V1, V2, V3] = DEMO_VALIDATORS;
const ZERO = '0x0000000000000000000000000000000000000000000000000000000000000000';

function fresh() {
  return createRegistry([V1, V2, V3]);
}

function expectRegistryError(fn: () => unknown, code: string) {
  expect(() => fn()).toThrowError(expect.objectContaining({ code }));
}

describe('registry: submitPack', () => {
  it('menolak hash bernilai nol dan metadata kosong', () => {
    let state = fresh();
    expectRegistryError(() => submitPack(state, { regionId: 0, hashes: { ...HASHES, dataset: ZERO }, metadataUri: 'u', proposer: 'p' }), 'ZERO_HASH');
    expectRegistryError(() => submitPack(state, { regionId: 0, hashes: { ...HASHES, model: ZERO }, metadataUri: 'u', proposer: 'p' }), 'ZERO_HASH');
    expectRegistryError(() => submitPack(state, { regionId: 0, hashes: { ...HASHES, intentSchema: ZERO }, metadataUri: 'u', proposer: 'p' }), 'ZERO_HASH');
    expectRegistryError(() => submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: '   ', proposer: 'p' }), 'EMPTY_METADATA');
    expect(state.packs.length).toBe(0);
    void state;
  });

  it('membuat pack Proposed dengan proposer dan metadata', () => {
    let state = fresh();
    const out = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'u', proposer: 'team' }, 1);
    state = out.state;
    expect(out.packId).toBe('pack-0-0');
    expect(state.packs).toHaveLength(1);
    const pack = state.packs[0];
    expect(pack.status).toBe('Proposed');
    expect(pack.proposer).toBe('team');
    expect(pack.metadataUri).toBe('u');
    expect(pack.approvalCount).toBe(0);
    expect(pack.createdAt).toBe(1);
  });
});

describe('registry: kuorum persetujuan (FR-045)', () => {
  it('menolak persetujuan non-validator dan persetujuan ganda', () => {
    let state = fresh();
    const submitted = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'u', proposer: 'p' });
    state = submitted.state;
    expectRegistryError(() => approvePack(state, submitted.packId, 'orang-luar'), 'NOT_VALIDATOR');
    state = approvePack(state, submitted.packId, V1);
    expectRegistryError(() => approvePack(state, submitted.packId, V1), 'DUPLICATE_APPROVAL');
  });

  it('aktivasi hanya saat kuorum 2 dicapai; satu pack aktif per region (FR-046)', () => {
    let state = fresh();
    const a = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'v1', proposer: 'p' });
    state = a.state;
    state = approvePack(state, a.packId, V1, 10);
    expect(getActivePack(state, 0)).toBeNull();

    state = approvePack(state, a.packId, V2, 11);
    const active = getActivePack(state, 0);
    expect(active?.packId).toBe(a.packId);
    expect(active?.status).toBe('Active');
    expect(active?.activatedAt).toBe(11);

    expectRegistryError(() => approvePack(state, a.packId, V3), 'NOT_ACTIVATABLE');

    const b = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'v2', proposer: 'p' });
    state = b.state;
    state = approvePack(state, b.packId, V2);
    state = approvePack(state, b.packId, V3, 20);
    expect(getActivePack(state, 0)?.packId).toBe(b.packId);
    expect(getPack(state, a.packId)?.status).toBe('Superseded');
  });

  it('dua pack aktif di region berbeda diizinkan', () => {
    let state = fresh();
    const a = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'v1', proposer: 'p' });
    state = a.state;
    state = approvePack(state, a.packId, V1);
    state = approvePack(state, a.packId, V2);
    const b = submitPack(state, { regionId: 3, hashes: HASHES, metadataUri: 'v2', proposer: 'p' });
    state = b.state;
    state = approvePack(state, b.packId, V1);
    state = approvePack(state, b.packId, V2);
    expect(getActivePack(state, 0)?.packId).toBe(a.packId);
    expect(getActivePack(state, 3)?.packId).toBe(b.packId);
  });
});

describe('registry: deprecation kuorum dua validator berbeda (FR-047)', () => {
  function activePack() {
    let state = fresh();
    const a = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'v1', proposer: 'p' });
    state = a.state;
    state = approvePack(state, a.packId, V1);
    state = approvePack(state, a.packId, V2);
    return { state, packId: a.packId };
  }

  it('proposal + persetujuan validator kedua menonaktifkan pack', () => {
    let { state, packId } = activePack();
    expectRegistryError(() => approveDeprecation(state, packId, V2), 'DEPRECATION_NOT_PROPOSED');
    state = proposeDeprecation(state, packId, V1, '0xreason', 1);
    expectRegistryError(() => proposeDeprecation(state, packId, V2, '0xother'), 'ALREADY_DEPRECATION_PROPOSED');
    expectRegistryError(() => approveDeprecation(state, packId, V1), 'DEPRECATION_REQUIRES_SECOND_VALIDATOR');
    state = approveDeprecation(state, packId, V2, 2);
    expect(getPack(state, packId)?.status).toBe('Deprecated');
    expect(getActivePack(state, 0)).toBeNull();
  });

  it('menolak deprecation pada pack yang bukan Active dan alasan nol', () => {
    const { state, packId } = activePack();
    expectRegistryError(() => proposeDeprecation(state, packId, V1, ZERO), 'ZERO_REASON');
    expectRegistryError(() => proposeDeprecation(state, 'pack-x', V1, '0xr'), 'PACK_NOT_FOUND');
  });
});

describe('registry: verifikasi kiosk', () => {
  it('aksep hanya pack Active dengan hash cocok', () => {
    let state = fresh();
    const a = submitPack(state, { regionId: 0, hashes: HASHES, metadataUri: 'v1', proposer: 'p' });
    state = a.state;
    expect(verifyLocalPack(state, a.packId, HASHES).accepted).toBe(false);
    state = approvePack(state, a.packId, V1);
    state = approvePack(state, a.packId, V2);
    expect(verifyLocalPack(state, a.packId, HASHES)).toMatchObject({ known: true, status: 'Active', hashMatches: true, accepted: true });
    expect(verifyLocalPack(state, a.packId, { ...HASHES, model: '0xDEAD' }).accepted).toBe(false);
    expect(verifyLocalPack(state, 'pack-tidak-ada', HASHES)).toMatchObject({ known: false });
  });

  it('state contoh demo sudah Active di region 0', () => {
    expect(isValidator(demoRegistryState(), V1)).toBe(true);
    expect(getActivePack(demoRegistryState(), DEMO_REGION)?.packId).toBe(LANGUAGE_PACK.packId);
    expect(verifyLocalPack(demoRegistryState(), LANGUAGE_PACK.packId, HASHES).accepted).toBe(true);
  });
});