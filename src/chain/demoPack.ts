import manifest from '../../public/language-pack/manifest.json';
import { approvePack, createRegistry, submitPack, type RegistryState } from './registry';

export const LANGUAGE_PACK = manifest;

export const DEMO_VALIDATORS = ['validator-a', 'validator-b', 'validator-c'];

export const DEMO_REGION = LANGUAGE_PACK.regionId;

// State registry default: satu pack contoh sudah disetujui dua dari tiga validator
// (simulasi). Rekaman on-chain tidak berpengaruh karena kontrak belum di-deploy.
export function demoRegistryState(): RegistryState {
  let state = createRegistry([...DEMO_VALIDATORS]);
  const submitted = submitPack(state, {
    packId: LANGUAGE_PACK.packId,
    regionId: DEMO_REGION,
    hashes: {
      dataset: LANGUAGE_PACK.dataset.sha256,
      model: LANGUAGE_PACK.model.sha256,
      intentSchema: LANGUAGE_PACK.intentSchema.sha256,
    },
    metadataUri: LANGUAGE_PACK.metadataUri,
    proposer: 'team-proposer',
  }, 1);
  state = submitted.state;
  state = approvePack(state, submitted.packId, DEMO_VALIDATORS[0], 2);
  state = approvePack(state, submitted.packId, DEMO_VALIDATORS[1], 3);
  return state;
}