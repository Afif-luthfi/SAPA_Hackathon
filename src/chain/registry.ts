// Mirror aturan LanguagePackRegistry (§12 PRD) yang deterministik dan dapat diuji.
// Ini bukan kontrak; kontrak Solidity yang sejalan ada di chain/LanguagePackRegistry.sol.
// Status versi chain yang dipakai aplikasi ditampilkan apa adanya dan belum di-deploy.

export const QUORUM_APPROVALS = 2;
export const VALIDATOR_COUNT = 3;

export type PackStatus = 'Proposed' | 'Active' | 'Rejected' | 'Deprecated' | 'Superseded';

export interface PackHashes {
  dataset: string;
  model: string;
  intentSchema: string;
}

export interface LanguagePack {
  packId: string;
  proposer: string;
  regionId: number;
  metadataUri: string;
  hashes: PackHashes;
  approvers: string[];
  approvalCount: number;
  deprecation: {
    proposer: string | null;
    reasonHash: string | null;
    approvers: string[];
  };
  status: PackStatus;
  createdAt: number;
  activatedAt: number | null;
}

export interface RegistryState {
  packs: LanguagePack[];
  validators: string[];
  active: Record<number, string>;
}

export type RegistryErrorCode =
  | 'NOT_VALIDATOR'
  | 'DUPLICATE_APPROVAL'
  | 'PACK_NOT_FOUND'
  | 'NOT_ACTIVATABLE'
  | 'ZERO_HASH'
  | 'EMPTY_METADATA'
  | 'ZERO_REASON'
  | 'ALREADY_DEPRECATION_PROPOSED'
  | 'DEPRECATION_NOT_PROPOSED'
  | 'DEPRECATION_REQUIRES_SECOND_VALIDATOR'
  | 'NOT_DEPRECATABLE';

export class RegistryError extends Error {
  code: RegistryErrorCode;
  constructor(code: RegistryErrorCode, message: string) {
    super(message);
    this.name = 'RegistryError';
    this.code = code;
  }
}

export function isZeroHash(value: string): boolean {
  return /^0x0*$/.test(value);
}

export function createRegistry(validators: string[] = []): RegistryState {
  return { packs: [], validators: [...validators], active: {} };
}

function clone(state: RegistryState): RegistryState {
  return {
    packs: state.packs.map(pack => ({
      ...pack,
      hashes: { ...pack.hashes },
      approvers: [...pack.approvers],
      deprecation: { ...pack.deprecation, approvers: [...pack.deprecation.approvers] },
    })),
    validators: [...state.validators],
    active: { ...state.active },
  };
}

function mustBeValidator(state: RegistryState, account: string) {
  if (!state.validators.includes(account)) {
    throw new RegistryError('NOT_VALIDATOR', 'Transaksi hanya dapat dilakukan validator terdaftar.');
  }
}

function requirePack(state: RegistryState, packId: string): LanguagePack {
  const pack = state.packs.find(item => item.packId === packId);
  if (!pack) throw new RegistryError('PACK_NOT_FOUND', 'Pack tidak ditemukan di registry.');
  return pack;
}

export function submitPack(
  state: RegistryState,
  input: { regionId: number; hashes: PackHashes; metadataUri: string; proposer: string; packId?: string },
  now = 0,
): { state: RegistryState; packId: string } {
  if (isZeroHash(input.hashes.dataset) || isZeroHash(input.hashes.model) || isZeroHash(input.hashes.intentSchema)) {
    throw new RegistryError('ZERO_HASH', 'Hash dataset, model, atau intent schema tidak boleh kosong.');
  }
  if (!input.metadataUri.trim()) {
    throw new RegistryError('EMPTY_METADATA', 'metadataURI tidak boleh kosong.');
  }
  const next = clone(state);
  const packId = input.packId ?? `pack-${input.regionId}-${next.packs.length}`;
  next.packs.push({
    packId,
    proposer: input.proposer,
    regionId: input.regionId,
    metadataUri: input.metadataUri,
    hashes: { ...input.hashes },
    approvers: [],
    approvalCount: 0,
    deprecation: { proposer: null, reasonHash: null, approvers: [] },
    status: 'Proposed',
    createdAt: now,
    activatedAt: null,
  });
  return { state: next, packId };
}

export function approvePack(state: RegistryState, packId: string, validator: string, now = 0): RegistryState {
  mustBeValidator(state, validator);
  const next = clone(state);
  const pack = requirePack(next, packId);
  if (pack.status !== 'Proposed') {
    throw new RegistryError('NOT_ACTIVATABLE', 'Hanya pack berstatus Proposed yang dapat disetujui.');
  }
  if (pack.approvers.includes(validator)) {
    throw new RegistryError('DUPLICATE_APPROVAL', 'Validator ini sudah menyetujui pack yang sama.');
  }
  pack.approvers.push(validator);
  pack.approvalCount += 1;
  if (pack.approvalCount >= QUORUM_APPROVALS) {
    for (const other of next.packs) {
      if (other.packId !== packId && other.regionId === pack.regionId && other.status === 'Active') {
        other.status = 'Superseded';
      }
    }
    pack.status = 'Active';
    pack.activatedAt = now;
    next.active[pack.regionId] = packId;
  }
  return next;
}

export function proposeDeprecation(
  state: RegistryState,
  packId: string,
  validator: string,
  reasonHash: string,
  now = 0,
): RegistryState {
  mustBeValidator(state, validator);
  const next = clone(state);
  const pack = requirePack(next, packId);
  if (pack.status !== 'Active') {
    throw new RegistryError('NOT_DEPRECATABLE', 'Hanya pack aktif yang dapat diusulkan untuk dinonaktifkan.');
  }
  if (pack.deprecation.proposer) {
    throw new RegistryError('ALREADY_DEPRECATION_PROPOSED', 'Proposal deprecation untuk pack ini sudah ada.');
  }
  if (isZeroHash(reasonHash)) {
    throw new RegistryError('ZERO_REASON', 'reasonHash tidak boleh kosong.');
  }
  pack.deprecation.proposer = validator;
  pack.deprecation.reasonHash = reasonHash;
  pack.deprecation.approvers = [];
  void now;
  return next;
}

export function approveDeprecation(state: RegistryState, packId: string, validator: string, now = 0): RegistryState {
  mustBeValidator(state, validator);
  const next = clone(state);
  const pack = requirePack(next, packId);
  if (pack.status !== 'Active') {
    throw new RegistryError('NOT_DEPRECATABLE', 'Hanya pack aktif yang dapat dinonaktifkan.');
  }
  if (!pack.deprecation.proposer) {
    throw new RegistryError('DEPRECATION_NOT_PROPOSED', 'Proposal deprecation belum ada.');
  }
  if (pack.deprecation.proposer === validator) {
    throw new RegistryError('DEPRECATION_REQUIRES_SECOND_VALIDATOR', 'Deprecation memerlukan validator kedua yang berbeda.');
  }
  if (pack.deprecation.approvers.includes(validator)) {
    throw new RegistryError('DUPLICATE_APPROVAL', 'Validator ini sudah menyetujui deprecation yang sama.');
  }
  pack.deprecation.approvers.push(validator);
  if (pack.deprecation.approvers.length + 1 >= QUORUM_APPROVALS) {
    pack.status = 'Deprecated';
    pack.activatedAt = null;
    if (next.active[pack.regionId] === packId) delete next.active[pack.regionId];
  }
  void now;
  return next;
}

export function getActivePack(state: RegistryState, regionId: number): LanguagePack | null {
  const packId = state.active[regionId];
  if (!packId) return null;
  const pack = state.packs.find(item => item.packId === packId);
  return pack && pack.status === 'Active' ? pack : null;
}

export function getPack(state: RegistryState, packId: string): LanguagePack | null {
  return state.packs.find(item => item.packId === packId) ?? null;
}

export function isValidator(state: RegistryState, account: string): boolean {
  return state.validators.includes(account);
}

export type LocalVerification = {
  packId: string;
  known: boolean;
  status: PackStatus | 'Unknown';
  hashMatches: boolean;
  accepted: boolean;
};

export function verifyLocalPack(state: RegistryState, packId: string, hashes: PackHashes): LocalVerification {
  const pack = getPack(state, packId);
  if (!pack) return { packId, known: false, status: 'Unknown', hashMatches: false, accepted: false };
  const hashMatches = pack.hashes.dataset === hashes.dataset
    && pack.hashes.model === hashes.model
    && pack.hashes.intentSchema === hashes.intentSchema;
  return {
    packId,
    known: true,
    status: pack.status,
    hashMatches,
    accepted: pack.status === 'Active' && hashMatches,
  };
}