import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, CameraOff, Check, CircleHelp, Download, FlaskConical, HandHeart, LoaderCircle, LockKeyhole, Radio, ShieldCheck, Square, Trash2 } from 'lucide-react';
import { useCameraPreview } from '../vision/useCameraPreview';
import { phrases } from '../data/content';
import { Modal } from '../components/Modal';
import { CAPTURE_LIMIT_MS, LandmarkRecorder, summarizeSample, type DatasetSample, type SampleMetadata, type Split } from './recorder';
import '../components/camera.css';
import './studio.css';
import { RegistryPanel } from './RegistryPanel';

export default function DatasetStudio() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recorder = useRef(new LandmarkRecorder());
  const timer = useRef(0);
  const urls = useRef(new Set<string>());
  const healthRequest = useRef<AbortController | null>(null);
  const [metadata, setMetadata] = useState<SampleMetadata>({
    signerId: '', consentReference: '', region: 'unassigned', intentId: 'INT-01', split: 'train',
  });
  const [consented, setConsented] = useState(false);
  const [recording, setRecording] = useState(false);
  const [count, setCount] = useState(0);
  const [sample, setSample] = useState<DatasetSample | null>(null);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [exitDialog, setExitDialog] = useState(false);
  const [health, setHealth] = useState('Belum diperiksa');
  const [checking, setChecking] = useState(false);

  const camera = useCameraPreview(videoRef, canvasRef, {
    onFrame: frame => {
      if (!recorder.current.isRecording) return;
      try {
        const full = recorder.current.append(frame);
        setCount(recorder.current.count);
        if (full) finishRecording();
      } catch (problem) {
        clearCapture();
        setError(problem instanceof Error ? problem.message : 'Sampel belum dapat diproses.');
      }
    },
    onRelease: () => {
      if (recorder.current.isRecording) {
        clearCapture();
        setNotice('Perekaman dibatalkan karena kamera berhenti. Tidak ada sampel yang disimpan.');
      }
    },
  });

  useEffect(() => () => {
    recorder.current.cancel();
    clearTimeout(timer.current);
    healthRequest.current?.abort();
    healthRequest.current = null;
    urls.current.forEach(url => URL.revokeObjectURL(url));
    urls.current.clear();
  }, []);

  function clearCapture() {
    clearTimeout(timer.current);
    recorder.current.cancel();
    setRecording(false);
    setCount(0);
    setSample(null);
  }

  function updateMetadata(change: Partial<SampleMetadata>) {
    setMetadata(previous => ({ ...previous, ...change }));
    if ('signerId' in change || 'consentReference' in change || 'region' in change) setConsented(false);
  }

  function startRecording() {
    if (camera.phase !== 'active') return;
    setError(''); setNotice('');
    try {
      recorder.current.begin(metadata, consented);
      setSample(null); setCount(0); setRecording(true);
      timer.current = window.setTimeout(finishRecording, CAPTURE_LIMIT_MS);
    } catch (problem) { setError(problem instanceof Error ? problem.message : 'Periksa informasi sampel.'); }
  }

  function finishRecording() {
    if (!recorder.current.isRecording) return;
    clearTimeout(timer.current);
    setRecording(false);
    try {
      const result = recorder.current.finish();
      setSample(result);
      setCount(result.frames.length);
      setNotice('Sampel siap diperiksa. Belum diunduh dan belum ditinjau penutur BISINDO.');
    } catch (problem) {
      setSample(null); setCount(0);
      setError(problem instanceof Error ? problem.message : 'Sampel belum cukup untuk diperiksa.');
    }
    camera.stop('Kamera dimatikan setelah pengambilan sampel.');
  }

  function downloadSample() {
    if (!sample || !consented) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(sample)], { type: 'application/json' }));
    urls.current.add(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sapa-sequence-' + crypto.randomUUID() + '.json';
    link.click();
    window.setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
    setNotice('Unduhan dimulai. Simpan berkas secara privat; status review tetap pending. Berkas yang diunduh tidak ikut terhapus saat halaman ditutup.');
  }

  function leave() {
    clearCapture();
    camera.stop();
    window.location.hash = '#main';
  }

  async function checkHealth() {
    healthRequest.current?.abort();
    const controller = new AbortController();
    healthRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    setChecking(true);
    try {
      const response = await fetch('/api/v1/health', { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Unavailable service');
      const value = await response.json() as { status?: string; model?: { available?: boolean } };
      if (value.status !== 'ok' || typeof value.model?.available !== 'boolean') throw new Error('Unexpected service');
      setHealth(value.model.available ? 'Layanan melaporkan model tersedia; evaluasi dan review tetap diperlukan.' : 'Layanan aktif. Model BISINDO belum tersedia.');
    } catch {
      if (healthRequest.current === controller) setHealth('Layanan belum terhubung. Studio tetap bisa digunakan tanpa layanan model.');
    } finally {
      clearTimeout(timeout);
      if (healthRequest.current === controller) setChecking(false);
    }
  }

  const locked = recording || !!sample;
  const stats = sample ? summarizeSample(sample) : null;
  const active = camera.phase === 'active';
  const preparing = camera.phase === 'requesting' || camera.phase === 'loading';

  return (
    <div className="studio-page">
      <header className="studio-header">
        <a href="#dataset" className="studio-brand"><span className="brand-mark"><HandHeart size={27} /></span><span>SAPA <strong>Studio</strong><small>RUANG KONTRIBUTOR</small></span></a>
        <button className="button secondary" onClick={() => recording || sample ? setExitDialog(true) : leave()}><ArrowLeft size={17} />Kembali ke SAPA</button>
      </header>
      <main className="studio-main">
        <div className="studio-title"><div><div className="eyebrow"><span />TAHAP 03A · PERSIAPAN DATA</div><h1>Bangun pemahaman, bersama.</h1><p>Siapkan sampel gerakan untuk ditinjau penutur BISINDO.</p></div><span className="pill"><FlaskConical size={15} />Studio dataset</span></div>
        <div className="studio-boundary"><ShieldCheck size={21} /><p><strong>Terpisah dari sesi pasien.</strong> Studio menyimpan titik gerak hanya setelah kamu memulai pengambilan sampel. Reviewer dan varian daerah belum ditentukan. Semua hasil berstatus <b>pending</b>, bukan BISINDO tervalidasi.</p></div>
        <div className="studio-grid">
          <section className="studio-card" aria-labelledby="metadata-title">
            <div className="studio-card-heading"><span className="studio-step">01</span><div><h2 id="metadata-title">Informasi kontribusi</h2><p>Gunakan kode samaran, tanpa identitas pribadi.</p></div></div>
            <fieldset disabled={locked} className="studio-fields">
              <label>ID samaran penutur<input value={metadata.signerId} onChange={e => updateMetadata({ signerId: e.target.value })} placeholder="signer-01" maxLength={47} autoComplete="off" /></label>
              <label>Kode referensi persetujuan<input value={metadata.consentReference} onChange={e => updateMetadata({ consentReference: e.target.value })} placeholder="consent-01" maxLength={60} autoComplete="off" /></label>
              <label>Varian daerah<input value={metadata.region} onChange={e => updateMetadata({ region: e.target.value })} maxLength={80} autoComplete="off" /><small>unassigned hanya untuk uji alat; tetapkan varian bersama reviewer sebelum training.</small></label>
              <label>Label kebutuhan<select value={metadata.intentId} onChange={e => updateMetadata({ intentId: e.target.value })}>{phrases.filter(item => item.id.startsWith('INT-')).map(item => <option key={item.id} value={item.id}>{item.id} · {item.text}</option>)}</select></label>
              <label>Pembagian data<select value={metadata.split} onChange={e => updateMetadata({ split: e.target.value as Split })}><option value="train">Train — latihan</option><option value="validation">Validation — pemilihan model</option><option value="test">Test — evaluasi akhir</option></select><small>Seluruh sampel seorang penutur harus berada pada split yang sama. Audit gabungan dilakukan sebelum training.</small></label>
            </fieldset>
            <div className="studio-consent">
              <LockKeyhole size={20} /><div><h3>Persetujuan kontribusi</h3><p>Titik tangan, tubuh, dan wajah dapat menjadi data pribadi. Sampel berada sementara di memori; hanya tombol unduh yang membuat berkas JSON pada perangkat ini. Tidak ada video/audio yang direkam atau diunggah.</p><p>Centang hanya jika kontributor memahami tujuan, akses, penyimpanan, serta proses penarikan data dan persetujuannya sudah didokumentasikan dengan kode di atas.</p>
              <label className="consent-checkbox"><input type="checkbox" checked={consented} disabled={locked} onChange={e => setConsented(e.target.checked)} /><span>Saya memiliki persetujuan kontributor untuk mengambil dan mengunduh titik gerak ini.</span></label></div>
            </div>
          </section>
          <section className="studio-card" aria-labelledby="capture-title">
            <div className="studio-card-heading"><span className="studio-step">02</span><div><h2 id="capture-title">Ambil satu sampel</h2><p>Mulai dan akhiri satu gerakan, maksimal 6 detik.</p></div></div>
            <div className={'camera-view studio-camera' + (active || camera.phase === 'loading' ? ' has-preview' : '')} style={{ aspectRatio: camera.aspectRatio }}>
              <video ref={videoRef} data-testid="studio-video" autoPlay playsInline muted className="camera-video" aria-label="Pratinjau kamera kontributor" />
              <canvas ref={canvasRef} className="landmark-overlay" aria-hidden="true" />
              {!active && <div className="camera-cover"><div className="camera-cover-icon">{preparing ? <LoaderCircle size={29} className="spinner" /> : <Camera size={29} />}</div><strong>{preparing ? 'Menyiapkan kamera…' : 'Kamera belum aktif'}</strong><span>Pratinjau saja belum mengambil sampel.</span></div>}
              {active && <span className="camera-live-label"><span />{recording ? 'Mengambil titik gerak' : 'Pratinjau aktif'}</span>}
              <span className="camera-local"><LockKeyhole size={12} />Tanpa unggahan</span>
            </div>
            {camera.error && <div className="camera-error" role="alert"><CircleHelp size={19} /><p>{camera.error}</p></div>}
            {active && <p className="studio-camera-guidance" role="status">{camera.quality?.guidance ?? 'Mencari posisi tangan dan tubuh…'}</p>}
            <div className="studio-capture-actions">
              {active ? <button className="button secondary" onClick={() => camera.stop()}><CameraOff size={17} />Matikan kamera</button>
                : preparing ? <button className="button secondary" onClick={() => camera.stop()}><Square size={17} />Batalkan kamera</button>
                : <button className="button secondary" onClick={() => void camera.start()} disabled={!!sample}><Camera size={17} />Aktifkan kamera</button>}
              {recording ? <button className="button primary" onClick={finishRecording}><Square size={17} />Selesaikan sampel</button>
                : <button className="button primary" onClick={startRecording} disabled={!active || !consented || !!sample}><Radio size={17} />Mulai ambil sampel</button>}
            </div>
            {recording && <div className="studio-recording" role="status"><span className="record-dot" /><strong>{count} frame terkumpul</strong><span>Berhenti otomatis setelah 6 detik</span><button onClick={() => { clearCapture(); setNotice('Sampel dibatalkan dan dibersihkan.'); }}>Batalkan sampel</button></div>}
            {error && <p className="camera-error" role="alert">{error}</p>}
            {notice && <p className="camera-note" role="status">{notice}</p>}
            <section className="studio-review" aria-labelledby="review-title">
              <div className="studio-card-heading"><span className="studio-step">03</span><div><h2 id="review-title">Periksa sebelum mengunduh</h2><p>Format yang baik belum membuktikan isyaratnya benar.</p></div></div>
              {sample && stats ? <><div className="sample-metrics"><div><strong>{stats.frames}</strong><span>frame</span></div><div><strong>{(stats.durationMs / 1000).toFixed(1)} s</strong><span>durasi</span></div><div><strong>{stats.handsPercent}%</strong><span>tangan terlihat</span></div></div><dl className="sample-details"><div><dt>Label</dt><dd>{sample.intentId}</dd></div><div><dt>Varian</dt><dd>{sample.region}</dd></div><div><dt>Review</dt><dd>Pending — perlu penutur BISINDO</dd></div></dl><div className="studio-capture-actions"><button className="button secondary" onClick={() => { clearCapture(); setNotice('Sampel di memori telah dihapus. Berkas yang pernah diunduh tetap berada di perangkat.'); }}><Trash2 size={17} />Hapus sampel</button><button className="button primary" onClick={downloadSample}><Download size={17} />Unduh JSON</button></div></>
                : <div className="studio-empty"><Check size={23} /><p>Belum ada sampel siap unduh.<br />Data tidak tersimpan sampai kamu memulai pengambilan sampel.</p></div>}
            </section>
          </section>
        </div>
        <RegistryPanel />
        <section className="studio-service"><div><h2>Kesiapan layanan model</h2><p role="status">{health}</p><small>Pemeriksaan ini hanya membaca status. Sampel tidak dikirim ke layanan.</small></div><button className="button secondary" disabled={checking} onClick={() => void checkHealth()}>{checking ? 'Memeriksa…' : 'Periksa layanan'}<ArrowRight size={17} /></button></section>
        <footer className="studio-footer">SAPA Studio · Dataset berizin, label ditinjau, evaluasi per penutur.</footer>
      </main>
      {exitDialog && <Modal title="Keluar dari studio?" onClose={() => setExitDialog(false)}><p>Sampel di memori akan dihapus dan kamera dimatikan. Berkas yang sudah diunduh tetap berada di perangkat.</p><div className="modal-actions"><button className="button secondary" onClick={() => setExitDialog(false)}>Tetap di studio</button><button className="button primary" onClick={leave}>Hapus dan keluar</button></div></Modal>}
    </div>
  );
}
