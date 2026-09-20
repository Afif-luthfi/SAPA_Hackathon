import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { stopSpeaking } from '../intent/speech';
import './staff-speech.css';

interface SpeechResult { isFinal: boolean; [index: number]: { transcript: string }; }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionConstructor = new () => Recognition;
function recognitionConstructor(): RecognitionConstructor | undefined {
  const host = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition;
}

const errors: Record<string, string> = {
  'not-allowed': 'Izin mikrofon ditolak. Izinkan melalui browser atau ketik balasan.',
  'service-not-allowed': 'Layanan suara tidak diizinkan. Silakan ketik balasan.',
  'audio-capture': 'Mikrofon tidak tersedia. Periksa perangkat atau ketik balasan.',
  'network': 'Layanan suara tidak terhubung. Silakan coba lagi atau ketik balasan.',
  'no-speech': 'Ucapan belum terdengar. Coba lagi atau ketik balasan.',
  'language-not-supported': 'Bahasa Indonesia belum didukung layanan suara ini. Silakan ketik balasan.',
};

export function StaffSpeechInput({ draft, onUse, context }: { draft: string; onUse: (text: string) => void; context: string }) {
  const [consented, setConsented] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'starting' | 'listening' | 'stopping'>('idle');
  const [finalText, setFinalText] = useState('');
  const [interim, setInterim] = useState('');
  const [truncated, setTruncated] = useState(false);
  const [notice, setNotice] = useState('');
  const run = useRef<Recognition | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const available = Boolean(recognitionConstructor()) && window.isSecureContext;
  const busy = phase !== 'idle';
  const merged = [draft.trim(), finalText.trim()].filter(Boolean).join(' ');

  const release = useCallback(() => {
    clearTimeout(timer.current);
    const previous = run.current;
    run.current = null;
    if (previous) {
      previous.onstart = previous.onresult = previous.onerror = previous.onend = null;
      try { previous.abort(); } catch { /* Already ended. */ }
    }
  }, []);

  const cancel = useCallback((message = 'Ucapan dibatalkan. Draf ketikan tetap tersedia.') => {
    release(); setPhase('idle'); setFinalText(''); setInterim(''); setTruncated(false); setNotice(message);
  }, [release]);

  useEffect(() => {
    cancel('');
  }, [context, cancel]);

  useEffect(() => {
    const hide = () => { if (document.visibilityState === 'hidden') cancel('Mikrofon dihentikan saat halaman tidak terlihat. Mulai lagi jika diperlukan.'); };
    const leave = () => cancel('Mikrofon dihentikan saat meninggalkan halaman.');
    document.addEventListener('visibilitychange', hide);
    window.addEventListener('pagehide', leave);
    return () => {
      document.removeEventListener('visibilitychange', hide);
      window.removeEventListener('pagehide', leave);
      release();
    };
  }, [cancel, release]);

  function stop() {
    const current = run.current;
    if (!current) return;
    clearTimeout(timer.current);
    setPhase('stopping');
    setNotice('Menyelesaikan ucapan…');
    timer.current = setTimeout(() => {
      if (run.current !== current) return;
      release(); setPhase('idle'); setInterim('');
      setNotice('Layanan belum menyelesaikan ucapan. Periksa hasil yang sudah tersedia atau ketik balasan.');
    }, 5000);
    try { current.stop(); } catch { cancel('Layanan suara berhenti. Silakan coba lagi atau ketik balasan.'); }
  }

  function start() {
    if (!consented || !available || run.current) return;
    setFinalText(''); setInterim(''); setTruncated(false); setNotice('Menunggu izin mikrofon…'); setPhase('starting');
    stopSpeaking();
    try {
      const Constructor = recognitionConstructor()!;
      const current = new Constructor();
      run.current = current;
      current.lang = 'id-ID'; current.continuous = false; current.interimResults = true; current.maxAlternatives = 1;
      current.onstart = () => {
        if (run.current !== current) { try { current.abort(); } catch { /* Stale permission. */ } return; }
        setPhase('listening'); setNotice('Mendengarkan. Ucapkan satu balasan singkat. Batas 30 detik.');
      };
      current.onresult = event => {
        if (run.current !== current) return;
        let complete = '', partial = '';
        for (let index = 0; index < event.results.length; index++) {
          const result = event.results[index];
          if (result.isFinal) complete += result[0].transcript + ' ';
          else partial += result[0].transcript + ' ';
        }
        setFinalText(complete.trim().slice(0, 1000)); setInterim(partial.trim().slice(0, 1000));
        setTruncated(complete.trim().length > 1000);
      };
      current.onerror = event => {
        if (run.current !== current) return;
        cancel(errors[event.error] ?? 'Ucapan belum dapat diproses. Silakan coba lagi atau ketik balasan.');
      };
      current.onend = () => {
        if (run.current !== current) return;
        clearTimeout(timer.current); run.current = null;
        current.onstart = current.onresult = current.onerror = current.onend = null;
        setPhase('idle'); setInterim('');
        setNotice('Mikrofon selesai. Periksa hasil di bawah; jika kosong, coba lagi atau ketik balasan.');
      };
      timer.current = setTimeout(() => {
        if (run.current !== current) return;
        cancel('Batas 30 detik tercapai. Ucapan dibatalkan; coba kalimat lebih singkat atau ketik balasan.');
      }, 30_000);
      current.start();
    } catch { cancel('Layanan suara belum dapat dimulai. Silakan ketik balasan.'); }
  }

  return <section className="staff-speech" aria-label="Draf dari suara petugas">
    <div className="staff-speech-title"><Mic size={16} /><strong>Ucapkan balasan</strong><span>Opsional</span></div>
    <p id="speech-privacy">Audio dapat dikirim oleh browser ke layanan pengenalan suara penyedianya dan memerlukan internet. SAPA tidak menyimpan rekaman audio. Gunakan untuk kebutuhan nonklinis; hasil harus diperiksa sebelum dikirim.</p>
    {!available ? <p role="status">Input suara tidak tersedia di browser ini. Tetap gunakan ketik atau template balasan.</p> : <>
      <label className="speech-consent"><input type="checkbox" checked={consented} aria-describedby="speech-privacy" onChange={event => { setConsented(event.target.checked); if (!event.target.checked) cancel(); }} />Saya memahami pemrosesan audio dan ingin memakai mikrofon.</label>
      <div className="speech-controls">
        {!busy ? <button className="button secondary compact" type="button" disabled={!consented} onClick={start}><Mic size={16} />Mulai ucapan</button>
          : <><button className="button secondary compact" type="button" disabled={phase !== 'listening'} onClick={stop}><Square size={15} />Selesai berbicara</button><button className="text-button" type="button" onClick={() => cancel()}><X size={15} />Batalkan ucapan</button></>}
      </div>
      <p className="speech-status" role="status">{notice}</p>
      {(finalText || interim) && <div className="speech-result"><strong>Hasil ucapan — belum dikirim</strong><p data-testid="speech-transcript">{finalText}{interim && <span className="speech-interim"> {interim} (sementara)</span>}</p>
        {truncated && <p role="alert">Hasil dibatasi 1.000 karakter dan terpotong. Periksa kelengkapan pesan pada draf sebelum mengirim.</p>}
        {merged.length > 1000 && <p role="alert">Gabungan draf melebihi 1.000 karakter. Pendekkan draf ketikan sebelum menambahkan hasil suara.</p>}
        <div className="speech-controls"><button className="button secondary compact" type="button" disabled={busy || !finalText || merged.length > 1000} onClick={() => { onUse(merged); setFinalText(''); setInterim(''); setNotice('Hasil ditambahkan ke draf. Edit dan periksa sebelum menekan Kirim balasan.'); }}>Tambahkan ke draf</button><button className="text-button" type="button" onClick={() => cancel('Hasil ucapan dihapus. Draf ketikan tetap tersedia.')}>Hapus hasil ucapan</button></div>
      </div>}
    </>}
  </section>;
}
