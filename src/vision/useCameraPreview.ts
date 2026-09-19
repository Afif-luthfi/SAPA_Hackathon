import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { assessFrame, drawLandmarks, type FrameQuality } from './quality';
import type { LandmarkFrame, WorkerReply, WorkerRequest } from './protocol';

type Phase = 'idle' | 'requesting' | 'loading' | 'active' | 'error';
interface CameraState {
  phase: Phase;
  error: string | null;
  note: string | null;
  quality: FrameQuality | null;
  inferenceMs: number | null;
  aspectRatio: number;
}
interface Run {
  stream: MediaStream | null;
  worker: Worker | null;
  animation: number;
  initTimeout: number;
  frameTimeout: number;
  inFlight: boolean;
  previousVideoTime: number;
  previousTick: number;
  detachTracks: (() => void) | null;
}
const emptyState: CameraState = {
  phase: 'idle', error: null, note: null, quality: null, inferenceMs: null, aspectRatio: 4 / 3,
};

export function cameraErrorMessage(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Izin kamera belum diberikan. Izinkan kamera melalui pengaturan browser, lalu coba lagi.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Kamera tidak ditemukan. Hubungkan kamera atau gunakan frasa dan ketik pesan.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Kamera sedang tidak dapat dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.';
  if (name === 'OverconstrainedError') return 'Kamera tidak mendukung pengaturan ini. Coba kamera lain atau gunakan pesan tertulis.';
  return 'Kamera belum dapat dimulai. Coba lagi atau gunakan frasa dan ketik pesan.';
}

export function useCameraPreview(
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  observers: { onFrame?: (frame: LandmarkFrame) => void; onRelease?: () => void } = {},
) {
  const [state, setState] = useState<CameraState>(emptyState);
  const runRef = useRef<Run | null>(null);
  const mounted = useRef(false);
  const observerRef = useRef(observers);
  observerRef.current = observers;

  const release = useCallback(() => {
    const run = runRef.current;
    runRef.current = null;
    if (run) {
      cancelAnimationFrame(run.animation);
      clearTimeout(run.initTimeout);
      clearTimeout(run.frameTimeout);
      run.detachTracks?.();
      if (run.worker) {
        run.worker.onmessage = null;
        run.worker.onerror = null;
        run.worker.terminate();
      }
      run.stream?.getTracks().forEach(track => track.stop());
      run.stream = null;
      run.worker = null;
      if (mounted.current) observerRef.current.onRelease?.();
    }
    const video = videoRef.current;
    if (video) { video.pause(); video.srcObject = null; }
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
  }, [videoRef, canvasRef]);

  const stop = useCallback((note: string | null = 'Kamera dimatikan. Pratinjau dan titik gerak telah dibersihkan.') => {
    release();
    if (mounted.current) setState({ ...emptyState, note });
  }, [release]);

  useEffect(() => {
    mounted.current = true;
    const onHidden = () => {
      if (document.visibilityState === 'hidden' && runRef.current) stop('Kamera dimatikan karena halaman tidak terlihat. Aktifkan kembali saat siap.');
    };
    const onPageHide = () => { if (runRef.current) stop('Kamera dimatikan saat meninggalkan halaman.'); };
    document.addEventListener('visibilitychange', onHidden);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      mounted.current = false;
      document.removeEventListener('visibilitychange', onHidden);
      window.removeEventListener('pagehide', onPageHide);
      release();
    };
  }, [release, stop]);

  const start = useCallback(async () => {
    if (!mounted.current || runRef.current) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setState({ ...emptyState, phase: 'error', error: 'Kamera memerlukan browser yang mendukungnya serta HTTPS atau localhost. Kamu tetap dapat memakai frasa dan mengetik.' });
      return;
    }
    if (!window.Worker || !window.createImageBitmap || !window.OffscreenCanvas) {
      setState({ ...emptyState, phase: 'error', error: 'Browser ini belum mendukung pendeteksian gerakan. Coba Chrome atau Edge terbaru, atau gunakan frasa.' });
      return;
    }
    const run: Run = {
      stream: null, worker: null, animation: 0, initTimeout: 0, frameTimeout: 0,
      inFlight: false, previousVideoTime: -1, previousTick: -Infinity, detachTracks: null,
    };
    runRef.current = run;
    const isCurrent = () => mounted.current && runRef.current === run;
    const fail = (message: string) => {
      if (!isCurrent()) return;
      release();
      setState({ ...emptyState, phase: 'error', error: message });
    };
    setState({ ...emptyState, phase: 'requesting' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      // Permission can resolve after cancellation or unmount. Never attach a late stream.
      if (!isCurrent()) { stream.getTracks().forEach(track => track.stop()); return; }
      run.stream = stream;
      const ended = () => fail('Kamera terputus atau izinnya dihentikan. Aktifkan kembali atau gunakan pesan tertulis.');
      stream.getVideoTracks().forEach(track => track.addEventListener('ended', ended));
      run.detachTracks = () => stream.getVideoTracks().forEach(track => track.removeEventListener('ended', ended));
      const video = videoRef.current;
      if (!video) { stop(); return; }
      video.srcObject = stream;
      setState({ ...emptyState, phase: 'loading' });
      run.initTimeout = window.setTimeout(() => fail('Pendeteksi gerakan belum dapat dimuat. Waktu persiapan habis; coba lagi atau gunakan frasa.'), 60_000);
      await video.play();
      if (!isCurrent()) return;
      setState(previous => ({ ...previous, aspectRatio: video.videoWidth / video.videoHeight || 4 / 3 }));
      const worker = new Worker('/vision/landmark-worker.js');
      run.worker = worker;

      const tick = (now: number) => {
        if (!isCurrent()) return;
        run.animation = requestAnimationFrame(tick);
        if (run.inFlight || now - run.previousTick < 100 || video.readyState < 2 || video.currentTime === run.previousVideoTime) return;
        run.inFlight = true;
        run.previousTick = now;
        run.previousVideoTime = video.currentTime;
        run.frameTimeout = window.setTimeout(() => fail('Pendeteksian gerakan terhenti. Kamera dimatikan; coba lagi atau gunakan frasa.'), 15_000);
        void createImageBitmap(video).then(bitmap => {
          if (!isCurrent()) { bitmap.close(); return; }
          try {
            const message: WorkerRequest = { type: 'frame', bitmap, timestampMs: now };
            worker.postMessage(message, [bitmap]);
          } catch {
            bitmap.close();
            fail('Frame kamera belum dapat diproses. Coba lagi atau gunakan frasa.');
          }
        }).catch(() => fail('Frame kamera belum dapat diproses. Coba lagi atau gunakan frasa.'));
      };

      worker.onmessage = (event: MessageEvent<WorkerReply>) => {
        if (!isCurrent()) return;
        const message = event.data;
        if (message.type === 'ready') {
          clearTimeout(run.initTimeout);
          setState(previous => ({ ...previous, phase: 'active' }));
          run.animation = requestAnimationFrame(tick);
        } else if (message.type === 'result') {
          clearTimeout(run.frameTimeout);
          run.inFlight = false;
          const canvas = canvasRef.current;
          if (canvas) drawLandmarks(canvas, message.frame, video.videoWidth, video.videoHeight);
          // Observers receive frames only while their panel is visible (e.g. the patient
          // panel collects frames while the user presses the record button). Nothing is sent.
          observerRef.current.onFrame?.(message.frame);
          // The patient preview keeps only UI summaries.
          setState(previous => ({ ...previous, quality: assessFrame(message.frame), inferenceMs: message.inferenceMs }));
        } else if (message.type === 'error') {
          fail(message.code === 'init'
            ? 'Pendeteksi gerakan belum dapat dimuat. Kamera dimatikan. Coba lagi atau gunakan frasa.'
            : 'Pendeteksian gerakan mengalami gangguan. Kamera dimatikan. Coba lagi atau gunakan frasa.');
        }
      };
      worker.onerror = event => { event.preventDefault(); fail('Pendeteksi gerakan belum dapat dimuat. Kamera dimatikan. Coba lagi atau gunakan frasa.'); };
      worker.postMessage({ type: 'init' } satisfies WorkerRequest);
    } catch (error) {
      fail(cameraErrorMessage(error));
    }
  }, [videoRef, canvasRef, release, stop]);

  return { ...state, start, stop };
}
