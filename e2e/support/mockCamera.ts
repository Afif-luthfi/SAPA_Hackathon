import { type Page } from '@playwright/test';
import type { LandmarkFrame } from '../../src/vision/protocol';

export async function mockCamera(page: Page, permission = 'granted', workerMode = 'ready', pattern: LandmarkFrame[] = []) {
  await page.addInitScript(({ permission, workerMode, pattern }) => {
    const probe = {
      permission, workerMode, requests: [] as MediaStreamConstraints[],
      stopped: 0, terminated: 0, resolveLate: null as null | (() => void),
      streams: [] as MediaStream[],
    };
    Reflect.set(window, '__cameraProbe', probe);
    function syntheticStream() {
      const canvas = document.createElement('canvas');
      canvas.width = 640; canvas.height = 480;
      const ctx = canvas.getContext('2d')!;
      const paint = () => { ctx.fillStyle = '#315744'; ctx.fillRect(0, 0, 640, 480); };
      paint();
      const timer = setInterval(paint, 80);
      const stream = canvas.captureStream(10);
      stream.getTracks().forEach(track => {
        const stop = track.stop.bind(track);
        track.stop = () => { probe.stopped++; clearInterval(timer); stop(); };
      });
      probe.streams.push(stream);
      return stream;
    }
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async (constraints: MediaStreamConstraints) => {
        probe.requests.push(constraints);
        if (probe.permission === 'denied') throw new DOMException('Denied for test', 'NotAllowedError');
        if (probe.permission === 'missing') throw new DOMException('No test device', 'NotFoundError');
        if (probe.permission === 'late') return new Promise<MediaStream>(resolve => {
          probe.resolveLate = () => resolve(syntheticStream());
        });
        return syntheticStream();
      },
    });
    let frameIndex = 0;
    const replyFrame = (timestampMs?: number) => {
      if (pattern.length > 0) {
        const frame = pattern[frameIndex % pattern.length];
        frameIndex += 1;
        return { ...frame, timestampMs: timestampMs ?? frame.timestampMs ?? 0 };
      }
      const points = (n: number) => Array.from({ length: n }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 1 }));
      return {
        timestampMs: timestampMs ?? 0, pose: points(33), leftHand: points(21), rightHand: points(21), face: points(478),
      };
    };
    class TestWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror = null;
      dead = false;
      postMessage(message: { type: string; bitmap?: ImageBitmap; timestampMs?: number }) {
        if (message.type === 'init') {
          setTimeout(() => {
            if (!this.dead) this.onmessage?.({ data: probe.workerMode === 'error'
              ? { type: 'error', code: 'init' } : { type: 'ready' } });
          }, 10);
        } else {
          message.bitmap?.close();
          const frame = replyFrame(message.timestampMs);
          setTimeout(() => {
            if (!this.dead) this.onmessage?.({ data: { type: 'result', inferenceMs: 12, frame } });
          }, 10);
        }
      }
      terminate() { this.dead = true; probe.terminated++; }
    }
    const NativeWorker = window.Worker;
    Reflect.set(window, 'Worker', new Proxy(NativeWorker, {
      construct(target, args) {
        return String(args[0]).includes('landmark-worker.js') ? new TestWorker() : Reflect.construct(target, args);
      },
    }));
  }, { permission, workerMode, pattern });
}

