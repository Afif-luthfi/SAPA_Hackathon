import { DEMO_REGION, LANGUAGE_PACK } from './demoPack';
import { getRegistry, isTamperedFiles } from './store';
import { getActivePack, verifyLocalPack, type LocalVerification, type PackHashes } from './registry';

export type PackVerdict =
  | { state: 'checking' }
  | { state: 'verified' }
  | { state: 'pending' }
  | { state: 'blocked'; reason: 'hash-mismatch' | 'deprecated' | 'not-listed' | 'unavailable' | 'no-active' }
  | { state: 'unknown' };

const EMPTY_DATASET_HASH = LANGUAGE_PACK.dataset.sha256;

export function verdictFromVerification(verification: LocalVerification): Exclude<PackVerdict, { state: 'checking' }> {
  if (!verification.known) return { state: 'blocked', reason: 'not-listed' };
  if (!verification.hashMatches) return { state: 'blocked', reason: 'hash-mismatch' };
  if (verification.status === 'Active') return { state: 'verified' };
  if (verification.status === 'Proposed') return { state: 'pending' };
  return { state: 'blocked', reason: 'deprecated' };
}

export async function sha256Hex(value: BufferSource): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', value);
  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function sha256OfText(text: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(text));
}

async function fetchPackFile(path: string): Promise<string> {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Pack file tidak ditemukan: ${path}`);
  return response.text();
}

// Menghitung hash file pack di perangkat. Atribut dataset tidak berupa berkas di
// prototipe; hash keadaan kosong dipakai agar format konsisten dengan kontrak.
export async function computePackHashes(): Promise<PackHashes> {
  const modelText = await fetchPackFile(`/language-pack/${LANGUAGE_PACK.model.file}`);
  const intentsText = await fetchPackFile(`/language-pack/${LANGUAGE_PACK.intentSchema.file}`);
  let model = await sha256OfText(modelText);
  if (isTamperedFiles()) {
    model = model.startsWith('0') ? `1${model.slice(1)}` : `0${model.slice(1)}`;
  }
  const intentSchema = await sha256OfText(intentsText);
  return { dataset: EMPTY_DATASET_HASH, model, intentSchema };
}

export async function checkPackVerdict(): Promise<Exclude<PackVerdict, { state: 'checking' }>> {
  try {
    const hashes = await computePackHashes();
    const active = getActivePack(getRegistry(), DEMO_REGION);
    if (!active) return { state: 'blocked', reason: 'no-active' };
    return verdictFromVerification(verifyLocalPack(getRegistry(), active.packId, hashes));
  } catch {
    return { state: 'blocked', reason: 'unavailable' };
  }
}