import { useRef, useState } from 'react';
import './camera.css';
import {
  Camera, CameraOff, Check, CircleHelp, Hand, LoaderCircle, LockKeyhole,
  ScanLine, ShieldCheck, Square, UserRound, ArrowRight, Radio,
} from 'lucide-react';
import { useCameraPreview } from '../vision/useCameraPreview';
import type { LandmarkFrame } from '../vision/protocol';

export const MIN_RECORD_FRAMES = 6;
export const MAX_RECORD_FRAMES = 40;
export const MIN_RECORD_MS = 600;
export const MAX_RECORD_MS = 3500;

interface CameraPanelProps {
  onUsePhrases: () => void;
  onSample?: (frames: LandmarkFrame[]) => void;
}

export function CameraPanel({ onUsePhrases, onSample }: CameraPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<LandmarkFrame[]>([]);
  const recordingRef = useRef(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef(0);
  const [recording, setRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  const [note, setNote] = useState('');

  function resetRecording() {
    recordingRef.current = false;
    framesRef.current = [];
    startedAtRef.current = 0;
    window.clearTimeout(timerRef.current);
    setRecording(false);
    setFrameCount(0);
  }

  function finishRecording() {
    if (!recordingRef.current) return;
    recordingRef.current = false;
    window.clearTimeout(timerRef.current);
    const items = framesRef.current;
    const elapsed = performance.now() - startedAtRef.current;
    framesRef.current = [];
    setRecording(false);
    setFrameCount(0);
    if (items.length < MIN_RECORD_FRAMES || elapsed < MIN_RECORD_MS) {
      setNote('Sinyal terlalu pendek. Tahan tombol lebih lama dan gerakkan tangan dengan jelas.');
      return;
    }
    setNote('');
    onSample?.(items);
  }

  function beginRecording(event?: React.PointerEvent<HTMLButtonElement>) {
    if (camera.phase !== 'active' || recordingRef.current) return;
    setNote('');
    recordingRef.current = true;
    framesRef.current = [];
    startedAtRef.current = performance.now();
    setRecording(true);
    setFrameCount(0);
    timerRef.current = window.setTimeout(finishRecording, MAX_RECORD_MS);
    if (event?.currentTarget && typeof event.currentTarget.setPointerCapture === 'function') {
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch { /* pointer mungkin berakhir saat elemen berganti */ }
    }
  }

  function handleFrame(frame: LandmarkFrame) {
    if (!recordingRef.current) return;
    framesRef.current.push(frame);
    setFrameCount(framesRef.current.length);
    if (framesRef.current.length >= MAX_RECORD_FRAMES) finishRecording();
  }

  const camera = useCameraPreview(videoRef, canvasRef, {
    onFrame: handleFrame,
    onRelease: () => {
      if (recordingRef.current) {
        resetRecording();
        setNote('Perekaman dibatalkan karena kamera berhenti.');
      }
    },
  });
  const isStarting = camera.phase === 'requesting' || camera.phase === 'loading';
  const hasPreview = camera.phase === 'loading' || camera.phase === 'active';
  const quality = camera.quality;
  const canRecord = camera.phase === 'active' && !!onSample;

  return (
    <section className="camera-panel" aria-labelledby="camera-heading">
      <div className="camera-intro">
        <span className="pill soft"><ScanLine size={14} />Isyarat ke teks · contoh</span>
        <h3 id="camera-heading">Siapkan ruang isyaratmu.</h3>
        <p>Posisikan tubuh dan tangan di depan kamera, lalu tahan tombol di bawah saat melakukan gerakan. Hasil belum dikirim sampai kamu memeriksanya.</p>
      </div>

      <div className={`camera-view${hasPreview ? ' has-preview' : ''}`} style={{ aspectRatio: camera.aspectRatio }}>
        <video ref={videoRef} data-testid="camera-video" autoPlay playsInline muted aria-label="Pratinjau kamera seperti cermin" className="camera-video" />
        <canvas ref={canvasRef} data-testid="landmark-overlay" className="landmark-overlay" aria-hidden="true" />
        <div className="camera-frame-guide" aria-hidden="true"><span /><span /><span /><span /></div>
        {!hasPreview && <div className="camera-cover"><div className="camera-cover-icon"><Camera size={34} strokeWidth={1.4} /></div><strong>{camera.phase === 'requesting' ? 'Menunggu izin kamera' : 'Kamera belum aktif'}</strong><span>{camera.phase === 'requesting' ? 'Pilih Izinkan pada permintaan browser.' : 'Aktifkan saat kamu sudah siap.'}</span></div>}
        {hasPreview && <span className="camera-live-label"><span />{camera.phase === 'loading' ? 'Menyiapkan pendeteksi…' : recording ? 'Sedang merekam isyarat' : 'Kamera aktif'}</span>}
        {camera.phase === 'loading' && <div className="camera-loading"><LoaderCircle size={25} className="spinner" /><span>Menyiapkan pendeteksi di perangkat…</span></div>}
        {recording && <div className="camera-recording" role="status"><span className="record-dot" /><strong>{frameCount} frame</strong><span>Tahan tombol sampai selesai</span></div>}
        <span className="camera-local"><LockKeyhole size={12} />Di perangkat ini</span>
      </div>

      {camera.error && <div className="camera-error" role="alert"><CircleHelp size={20} /><p>{camera.error}</p></div>}
      {camera.note && <p className="camera-note" role="status">{camera.note}</p>}
      {note && <p className="camera-note" role="status">{note}</p>}
      {camera.phase === 'active' && <>
        <div className={`camera-guidance ${quality?.tone ?? 'waiting'}`} role="status"><ScanLine size={19} /><p>{quality?.guidance ?? 'Mencari posisi tangan dan tubuh. Hadapkan tubuh ke kamera.'}</p></div>
        <div className="camera-observations" aria-label="Hasil pendeteksian gerakan">
          <span><Hand size={16} /><strong>{quality?.handCount ?? 0}/2</strong> tangan</span>
          <span><UserRound size={16} />{quality?.upperBodyVisible ? 'Bahu terlihat' : 'Cari posisi bahu'}</span>
          <span className="landmark-count">{quality?.pointCount ?? 0} titik terlihat</span>
        </div>
      </>}

      <div className="camera-actions">
        {camera.phase === 'active' && canRecord ? (
          recording ? (
            <>
              <button className="button primary full-camera-action record-live" data-testid="sign-record"
                onPointerUp={e => { e.preventDefault(); finishRecording(); }}
                onPointerCancel={finishRecording}
                onKeyUp={e => { if (e.key === ' ' || e.key === 'Enter') finishRecording(); }}
                onContextMenu={e => e.preventDefault()}
              >
                <Radio size={18} />Lepaskan untuk selesai
              </button>
              <button className="button secondary full-camera-action" onClick={() => { resetRecording(); setNote('Isyarat dibatalkan. Tidak ada hasil yang dibuat.'); }}><Square size={17} />Batalkan isyarat</button>
            </>
          ) : (
            <>
              <button className="button primary full-camera-action record-ready" data-testid="sign-record"
                onPointerDown={e => { e.preventDefault(); beginRecording(e); }}
                onKeyDown={e => { if (!e.repeat && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); beginRecording(); } }}
                onContextMenu={e => e.preventDefault()}
              >
                <Radio size={18} />Tahan untuk mulai isyarat
              </button>
              <button className="button secondary full-camera-action" onClick={() => camera.stop()}><CameraOff size={18} />Matikan kamera</button>
            </>
          )
        ) : camera.phase === 'active' ? (
          <button className="button secondary full-camera-action" onClick={() => camera.stop()}><CameraOff size={18} />Matikan kamera</button>
        ) : isStarting ? (
          <button className="button secondary full-camera-action" onClick={() => camera.stop('Persiapan dibatalkan. Kamera tidak akan menyala dari permintaan izin ini.')}><CameraOff size={18} />Batalkan</button>
        ) : (
          <button className="button primary full-camera-action" onClick={() => void camera.start()}><Camera size={18} />Aktifkan kamera</button>
        )}
      </div>
      <div className="camera-privacy"><ShieldCheck size={18} /><p>Kamera aktif hanya setelah kamu mengizinkan. Gerakan diproses sementara di browser untuk contoh alur, tanpa direkam, disimpan, atau dikirim. Mikrofon tidak digunakan.</p></div>
      <div className="camera-scope"><span><Check size={15} />Contoh teknis alur isyarat</span><span>Bukan terjemahan BISINDO tervalidasi</span></div>
      <button className="camera-fallback" onClick={onUsePhrases}>Gunakan frasa<ArrowRight size={16} /></button>
    </section>
  );
}