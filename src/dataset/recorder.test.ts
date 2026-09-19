import { describe, expect, it } from 'vitest';
import { LandmarkRecorder, summarizeSample, type SampleMetadata } from './recorder';
import type { LandmarkFrame } from '../vision/protocol';

const metadata: SampleMetadata = { signerId: 'signer-01', consentReference: 'consent-01', region: 'unassigned', intentId: 'INT-01', split: 'train' };
const points = (count: number) => Array.from({ length: count }, () => ({ x: .5, y: .5, z: 0, visibility: 1 }));
const frame = (timestampMs: number): LandmarkFrame => ({ timestampMs, pose: points(33), leftHand: points(21), rightHand: [], face: [] });
function collect(recorder: LandmarkRecorder) { for (let n = 0; n < 15; n++) recorder.append(frame(5000 + n * 100)); }

describe('explicit contribution recorder', () => {
  it('does not buffer frames before consent and start', () => {
    const r = new LandmarkRecorder();
    r.append(frame(10));
    expect(r.count).toBe(0);
    expect(() => r.begin(metadata, false)).toThrow('Persetujuan');
  });
  it('exports relative timestamps and pending review without modifying source coordinates', () => {
    const r = new LandmarkRecorder(); r.begin(metadata, true); collect(r);
    const sample = r.finish();
    expect(sample.frames[0].timestampMs).toBe(0);
    expect(sample.frames.at(-1)?.timestampMs).toBe(1400);
    expect(sample.reviewStatus).toBe('pending');
    expect(sample.source.mirrored).toBe(false);
    expect(summarizeSample(sample)).toMatchObject({ frames: 15, handsPercent: 100 });
    expect(r.count).toBe(0);
  });
  it('discards samples on cancellation', () => {
    const r = new LandmarkRecorder(); r.begin(metadata, true); collect(r); r.cancel();
    expect(r.count).toBe(0); expect(r.isRecording).toBe(false);
    expect(() => r.finish()).toThrow();
  });
  it('requires valid metadata and refuses unsupported labels', () => {
    const r = new LandmarkRecorder();
    expect(() => r.begin({ ...metadata, signerId: 'Full Name' }, true)).toThrow('samaran');
    expect(() => r.begin({ ...metadata, intentId: 'diagnosis' }, true)).toThrow('label');
    expect(() => r.begin({ ...metadata, consentReference: '' }, true)).toThrow('persetujuan');
  });
  it('does not retain points past six seconds', () => {
    const r = new LandmarkRecorder(); r.begin(metadata, true);
    r.append(frame(100)); expect(r.append(frame(6200))).toBe(true); expect(r.count).toBe(1);
  });
  it('rejects decreasing timestamps, malformed points, and NaN', () => {
    const r = new LandmarkRecorder(); r.begin(metadata, true); r.append(frame(100));
    expect(() => r.append(frame(90))).toThrow('Waktu');
    expect(() => r.append({ ...frame(200), pose: points(2) })).toThrow('Jumlah');
    const invalid = frame(300); invalid.pose[0].x = NaN;
    expect(() => r.append(invalid)).toThrow('tidak valid');
  });
  it('rejects blank or insufficient capture and resets after failure', () => {
    const r = new LandmarkRecorder(); r.begin(metadata, true);
    for (let n = 0; n < 15; n++) r.append({ timestampMs: n * 100, pose: [], leftHand: [], rightHand: [], face: [] });
    expect(() => r.finish()).toThrow('belum cukup terlihat');
    expect(r.count).toBe(0);
  });
  it('copies frame data so later mutations cannot change the captured sample', () => {
    const r = new LandmarkRecorder(); r.begin(metadata, true);
    const original = frame(4900); r.append(original); original.pose[11].x = .99; collect(r);
    expect(r.finish().frames[0].pose[11].x).toBe(.5);
  });
});
