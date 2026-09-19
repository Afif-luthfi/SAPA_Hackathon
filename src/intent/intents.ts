export const INTENT_IDS = [
  'INT-01', 'INT-02', 'INT-03', 'INT-04', 'INT-05',
  'INT-06', 'INT-07', 'INT-08', 'INT-09', 'INT-10',
] as const;

export type IntentId = (typeof INTENT_IDS)[number];

export const INTENT_TEXTS: Record<IntentId, string> = {
  'INT-01': 'Saya ingin mendaftar.',
  'INT-02': 'Saya sudah memiliki janji.',
  'INT-03': 'Saya membawa surat rujukan.',
  'INT-04': 'Saya menggunakan BPJS.',
  'INT-05': 'Di mana loket pendaftaran?',
  'INT-06': 'Di mana apotek?',
  'INT-07': 'Di mana laboratorium?',
  'INT-08': 'Saya membutuhkan penerjemah BISINDO.',
  'INT-09': 'Saya belum mengerti. Tolong ulangi atau tuliskan.',
  'INT-10': 'Terima kasih.',
};

export function isIntentId(value: string): value is IntentId {
  return INTENT_IDS.includes(value as IntentId);
}