import type { LandmarkFrame, Point } from '../vision/protocol';
import { assessFrame } from '../vision/quality';

export const CAPTURE_LIMIT_MS = 6000;
export const CAPTURE_LIMIT_FRAMES = 80;
export type Split = 'train' | 'validation' | 'test';
export interface SampleMetadata {
  signerId: string; consentReference: string; region: string; intentId: string; split: Split;
}
export interface DatasetSample extends SampleMetadata {
  schemaVersion: 1;
  reviewStatus: 'pending';
  source: { extractor: 'MediaPipe Holistic'; version: '1.0.1'; coordinateSpace: 'normalized-image'; mirrored: false };
  frames: LandmarkFrame[];
}

export function validateMetadata(value: SampleMetadata): SampleMetadata {
  const clean = {
    signerId: value.signerId.trim(), consentReference: value.consentReference.trim(),
    region: value.region.trim(), intentId: value.intentId, split: value.split,
  };
  if (!/^signer-[A-Za-z0-9_-]{1,40}$/.test(clean.signerId)) throw new Error('Gunakan ID samaran seperti signer-01, tanpa nama pribadi.');
  if (!/^[A-Za-z0-9_-]{3,60}$/.test(clean.consentReference)) throw new Error('Isi kode referensi persetujuan, 3–60 huruf/angka/tanda hubung.');
  if (!clean.region || clean.region.length > 80) throw new Error('Isi varian daerah, atau unassigned untuk uji alat yang belum ditinjau.');
  if (!/^INT-(0[1-9]|10)$/.test(clean.intentId)) throw new Error('Pilih label kebutuhan yang didukung.');
  if (!['train', 'validation', 'test'].includes(clean.split)) throw new Error('Pilih pembagian dataset.');
  return clean;
}

function copyPoints(points: Point[], expected: number): Point[] {
  if (![0, expected].includes(points.length)) throw new Error('Jumlah titik gerak tidak sesuai format.');
  return points.map(point => {
    if (![point.x, point.y, point.z].every(Number.isFinite) ||
        (point.visibility !== undefined && (!Number.isFinite(point.visibility) || point.visibility < 0 || point.visibility > 1))) {
      throw new Error('Titik gerak tidak valid.');
    }
    const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000;
    const result: Point = { x: round(point.x), y: round(point.y), z: round(point.z) };
    if (point.visibility !== undefined) result.visibility = round(point.visibility);
    return result;
  });
}

export function summarizeSample(sample: DatasetSample) {
  const qualities = sample.frames.map(assessFrame);
  return {
    frames: sample.frames.length,
    durationMs: sample.frames.at(-1)?.timestampMs ?? 0,
    handsPercent: Math.round(100 * qualities.filter(q => q.handCount > 0).length / Math.max(1, qualities.length)),
    bodyPercent: Math.round(100 * qualities.filter(q => q.upperBodyVisible).length / Math.max(1, qualities.length)),
  };
}

export class LandmarkRecorder {
  private metadata: SampleMetadata | null = null;
  private frames: LandmarkFrame[] = [];
  private firstTimestamp: number | null = null;
  private previousTimestamp = -Infinity;

  get count() { return this.frames.length; }
  get isRecording() { return this.metadata !== null; }

  begin(metadata: SampleMetadata, consented: boolean) {
    this.cancel();
    if (!consented) throw new Error('Persetujuan kontribusi diperlukan sebelum merekam titik gerak.');
    this.metadata = validateMetadata(metadata);
  }

  append(frame: LandmarkFrame): boolean {
    if (!this.metadata) return false;
    if (!Number.isFinite(frame.timestampMs) || frame.timestampMs <= this.previousTimestamp) throw new Error('Waktu frame harus meningkat.');
    const origin = this.firstTimestamp ?? frame.timestampMs;
    if (frame.timestampMs - origin > CAPTURE_LIMIT_MS || this.frames.length >= CAPTURE_LIMIT_FRAMES) return true;
    const copy: LandmarkFrame = {
      timestampMs: Math.round((frame.timestampMs - origin) * 1000) / 1000,
      pose: copyPoints(frame.pose, 33), leftHand: copyPoints(frame.leftHand, 21),
      rightHand: copyPoints(frame.rightHand, 21), face: copyPoints(frame.face, 478),
    };
    this.firstTimestamp = origin;
    this.previousTimestamp = frame.timestampMs;
    this.frames.push(copy);
    return this.frames.length >= CAPTURE_LIMIT_FRAMES;
  }

  finish(): DatasetSample {
    const metadata = this.metadata;
    const frames = this.frames;
    this.cancel();
    if (!metadata || frames.length < 10 || (frames.at(-1)?.timestampMs ?? 0) < 1000) {
      throw new Error('Sampel terlalu singkat. Rekam setidaknya 10 frame dan 1 detik gerakan.');
    }
    const sample: DatasetSample = {
      schemaVersion: 1, ...metadata, reviewStatus: 'pending',
      source: { extractor: 'MediaPipe Holistic', version: '1.0.1', coordinateSpace: 'normalized-image', mirrored: false },
      frames,
    };
    const quality = summarizeSample(sample);
    if (quality.handsPercent < 50 || quality.bodyPercent < 50) throw new Error('Tangan dan bahu belum cukup terlihat. Coba lagi dengan posisi dan pencahayaan yang lebih jelas.');
    return sample;
  }

  cancel() {
    this.metadata = null;
    this.frames = [];
    this.firstTimestamp = null;
    this.previousTimestamp = -Infinity;
  }
}
