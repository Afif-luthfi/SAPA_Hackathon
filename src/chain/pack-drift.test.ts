import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { INTENT_IDS, INTENT_TEXTS } from '../intent/intents';
import { DEMO_MODEL_CARD, PROTOTYPES } from '../intent/model';
import { LANGUAGE_PACK } from './demoPack';

const PACK_DIR = fileURLToPath(new URL('../../public/language-pack/', import.meta.url));

function sha256Of(path: string) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(PACK_DIR + file, 'utf8')) as T;
}

const manifest = readJson<{
  packId: string; metadataUri: string; network: { deployed: boolean }; dataset: { state: string; sha256: string };
  model: { id: string; file: string; sha256: string }; intentSchema: { file: string; sha256: string };
}>('manifest.json');

function modelJson() {
  return readJson<{ modelId: string; classes: { intentId: string; prototype: Record<string, number> }[] }>('model.json');
}

function intentsJson() {
  return readJson<{ id: string; text: string }[]>('intents.json');
}

describe('pack publik vs kode aplikasi (drift guard)', () => {
  it('intents.json sama persis dengan INTENT_TEXTS', () => {
    expect(INTENT_IDS.map(id => ({ id, text: INTENT_TEXTS[id] }))).toEqual(intentsJson());
  });

  it('model.json prototype sama persis dengan PROTOTYPES classifier', () => {
    const classes = modelJson().classes;
    expect(classes).toHaveLength(INTENT_IDS.length);
    for (const entry of classes) {
      expect(entry.prototype).toEqual(PROTOTYPES[entry.intentId as keyof typeof PROTOTYPES]);
    }
    expect(modelJson().modelId).toBe(DEMO_MODEL_CARD.modelId);
  });

  it('hash file pada manifest cocok dengan isi file', () => {
    expect(manifest.model.sha256).toBe(sha256Of(PACK_DIR + manifest.model.file));
    expect(manifest.intentSchema.sha256).toBe(sha256Of(PACK_DIR + manifest.intentSchema.file));
  });

  it('manifest bersikap jujur: belum di-deploy dan tanpa dataset', () => {
    expect(manifest.network.deployed).toBe(false);
    expect(manifest.dataset.state).toBe('none');
    expect(manifest.metadataUri).toBe('manifest.json');
  });
});

describe('demoPack alkitab dengan manifest', () => {
  it('LANGUAGE_PACK mengikuti manifest publik', () => {
    expect(LANGUAGE_PACK.packId).toBe(manifest.packId);
    expect(LANGUAGE_PACK.model.sha256).toBe(manifest.model.sha256);
    expect(LANGUAGE_PACK.intentSchema.sha256).toBe(manifest.intentSchema.sha256);
    expect(LANGUAGE_PACK.dataset.sha256).toBe(manifest.dataset.sha256);
  });
});