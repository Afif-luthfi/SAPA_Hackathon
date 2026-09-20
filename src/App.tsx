import { useEffect, useReducer, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, Check, CheckCheck, ChevronRight,
  CircleHelp, ClipboardList, Clock3, Contrast, FileText, FlaskConical, Hand,
  HandHeart, Heart, Hospital, Keyboard, LayoutGrid, LockKeyhole, LogOut,
  MapPin, MessageCircle, MessageSquare, Pill, Plus, Repeat2, Send, ShieldCheck,
  Type, UserRound, UsersRound, CalendarDays, CreditCard, Volume2, Database,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from './components/Modal';
import { StaffSpeechInput } from './components/StaffSpeechInput';
import { CameraPanel } from './components/CameraPanel';
import { SignResult } from './components/SignResult';
import { PackGate } from './components/PackGate';
import { usePackVerdict } from './chain/usePackVerdict';
import { LANGUAGE_PACK } from './chain/demoPack';
import { categories, phrases, staffResponses, type Category, type PhraseIcon } from './data/content';
import { initialSession, sessionReducer, type Role } from './domain/session';
import { classifySequence, intentText, type RecognitionResult } from './intent/model';
import type { IntentId } from './intent/intents';
import { speak, stopSpeaking } from './intent/speech';
import type { LandmarkFrame } from './vision/protocol';

const phraseIcons: Record<PhraseIcon, LucideIcon> = {
  register: ClipboardList, calendar: CalendarDays, file: FileText, card: CreditCard,
  pin: MapPin, pharmacy: Pill, lab: FlaskConical, hand: Hand,
  repeat: Repeat2, heart: Heart, queue: UsersRound, text: MessageSquare,
};
type InputMode = 'phrases' | 'type' | 'sign';
type Dialog = 'about' | 'help' | 'end' | null;

export default function App() {
  const [session, dispatch] = useReducer(sessionReducer, initialSession);
  const [mode, setMode] = useState<InputMode>('phrases');
  const [category, setCategory] = useState<Category>('all');
  const [draft, setDraft] = useState('');
  const [staffDraft, setStaffDraft] = useState('');
  const [dialog, setDialog] = useState<Dialog>(null);
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [signResult, setSignResult] = useState<RecognitionResult | null>(null);
  const pack = usePackVerdict();
  const conversationRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const list = conversationRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [session.messages]);

  function startSession() {
    dispatch({ type: 'START_SESSION' });
    setAnnouncement('Sesi dimulai. Pilih frasa atau ketik pesan Anda.');
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  function endSession() {
    dispatch({ type: 'END_SESSION' });
    setDraft('');
    setStaffDraft('');
    setMode('phrases');
    setCategory('all');
    setDialog(null);
    setSignResult(null);
    stopSpeaking();
    setAnnouncement('Sesi selesai. Percakapan dan permintaan bantuan telah dihapus.');
    requestAnimationFrame(() => startRef.current?.focus());
  }

  function sendMessage(role: Role, text: string) {
    if (!session.isActive || !text.trim() || text.trim().length > 1000) return;
    dispatch({ type: 'SEND_MESSAGE', message: { id: crypto.randomUUID(), role, text } });
    if (role === 'patient') setDraft('');
    else setStaffDraft('');
    setAnnouncement(role === 'patient' ? 'Pesan ditampilkan untuk petugas.' : 'Balasan ditampilkan untuk pasien.');
  }

  function selectPhrase(text: string) {
    setDraft(text);
    requestAnimationFrame(() => draftRef.current?.focus());
  }

  function requestAssistance(kind: 'staff' | 'interpreter') {
    dispatch({ type: 'REQUEST_ASSISTANCE', kind });
    setDialog(null);
    setAnnouncement('Permintaan bantuan ditampilkan di panel petugas pada layar ini.');
  }

  function handleSignSample(frames: LandmarkFrame[]) {
    const result = classifySequence(frames);
    if (!result) {
      setAnnouncement('Isyarat terlalu pendek. Coba lagi dengan gerakan yang lebih jelas.');
      return;
    }
    setSignResult(result);
    setAnnouncement(result.band === 'low'
      ? 'Isyarat belum dikenali. Tidak ada pesan yang dibuat.'
      : 'Hasil isyarat siap diperiksa. Belum dikirim ke petugas.');
  }

  function confirmSign(intentId: IntentId) {
    const text = intentText(intentId);
    stopSpeaking();
    sendMessage('patient', text);
    speak(text);
    setSignResult(null);
    setAnnouncement('Pesan dari isyarat tampil untuk petugas dan dibacakan.');
  }

  function retrySign() {
    setSignResult(null);
    stopSpeaking();
    setAnnouncement('Hasil dibatalkan. Tahan tombol untuk mencoba isyarat lagi.');
  }

  function changeMode(next: InputMode) {
    setMode(next);
    setSignResult(null);
    if (next !== 'sign') stopSpeaking();
    setAnnouncement(next === 'sign' ? 'Mode bahasa isyarat. Kamera aktif hanya atas izinmu.'
      : next === 'type' ? 'Mode ketik pesan.'
      : 'Mode pilih frasa');
  }

  const modeButtons: { id: InputMode; label: string; icon: LucideIcon }[] = [
    { id: 'phrases', label: 'Pilih frasa', icon: LayoutGrid },
    { id: 'type', label: 'Ketik pesan', icon: Keyboard },
    { id: 'sign', label: 'Bahasa isyarat', icon: Hand },
  ];

  const packStatusLabel = pack.verdict.state === 'checking' ? 'Memeriksa…'
    : pack.verdict.state === 'verified' ? 'Aktif — disetujui 2 dari 3 validator (simulasi)'
    : pack.verdict.state === 'pending' ? 'Belum disetujui validator'
    : pack.verdict.state === 'blocked'
      ? `Ditolak — ${pack.verdict.reason === 'hash-mismatch' ? 'file berubah' : pack.verdict.reason === 'deprecated' ? 'dinonaktifkan' : pack.verdict.reason === 'not-listed' ? 'tidak tercatat' : pack.verdict.reason === 'no-active' ? 'tidak ada pack aktif' : 'pemeriksaan gagal'}`
    : 'Tidak dapat dipastikan';

  return (
    <div className={`app-shell${largeText ? ' large-text' : ''}${highContrast ? ' high-contrast' : ''}`}>
      <a className="skip-link" href="#main">Langsung ke isi</a>
      <aside className="sidebar" aria-label="Navigasi utama">
        <a className="brand" href="#main" aria-label="SAPA Care, ruang komunikasi">
          <span className="brand-mark"><HandHeart size={28} strokeWidth={1.8} /></span>
          <span>sapa<span className="brand-dot">.</span><small>CARE</small></span>
        </a>
        <div className="workspace-label">RUANG LAYANAN</div>
        <nav className="main-nav">
          <a href="#main" className="nav-item selected" aria-current="page" aria-label="Komunikasi"><MessageCircle size={20} /><span>Komunikasi</span><span className="nav-dot" /></a>
          <button className="nav-item" aria-label="Mengenal SAPA" onClick={() => setDialog('about')}><CircleHelp size={20} /><span>Mengenal SAPA</span></button>
        </nav>
        <div className="sidebar-note">
          <div className="small-plant" aria-hidden="true"><Heart size={24} /></div>
          <p>Setiap cerita<br />layak didengar.</p>
          <span>Ruang komunikasi yang lebih ramah untuk semua.</span>
          <div className="note-decoration" aria-hidden="true" />
        </div>
        <div className="sidebar-bottom">
          <span className="facility-icon"><Hospital size={19} /></span>
          <div><strong>Meja informasi</strong><small>Rumah sakit contoh</small></div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb"><span>SAPA Care</span><ChevronRight size={14} /><strong>Ruang komunikasi</strong></div>
          <div className="topbar-tools">
            <span className="prototype-label">Prototipe · Tahap 04</span>
            <span className="toolbar-divider" /><button className="icon-button mobile-about" aria-label="Tentang SAPA" onClick={() => setDialog('about')}><CircleHelp size={20} /></button>
            <button className="icon-button text-size-button" aria-label="Perbesar teks" aria-pressed={largeText} onClick={() => setLargeText(!largeText)}><Type size={21} /><Plus size={10} /></button>
            <button className="icon-button" aria-label="Kontras tinggi" aria-pressed={highContrast} onClick={() => setHighContrast(!highContrast)}><Contrast size={20} /></button>
          </div>
        </header>

        <main id="main" className="page-content">
          <div className="page-heading">
            <div><div className="eyebrow"><span />AKSES KOMUNIKASI, UNTUK SEMUA</div><h1>Lebih dekat. Lebih mengerti.</h1><p>Sampaikan kebutuhanmu dengan cara yang paling nyaman.</p></div>
            <div className="session-badge"><span className={session.isActive ? 'status-dot active' : 'status-dot'} />{session.isActive ? 'Sesi berlangsung' : 'Siap menemani'}</div>
          </div>

          {!session.isActive ? (
            <>
              <section className="welcome-card" aria-labelledby="welcome-title">
                <div className="welcome-copy">
                  <span className="pill"><HandHeart size={16} />Ruang untuk saling memahami</span>
                  <h2 id="welcome-title">Halo, selamat datang<br />di <span>SAPA Care.</span></h2>
                  <p>Kami membantu kamu dan petugas berkomunikasi tentang pendaftaran, lokasi layanan, dan kebutuhan bantuan.</p>
                  <button ref={startRef} className="button primary welcome-cta" onClick={startSession}>Mulai sesi komunikasi<ArrowRight size={19} /></button>
                  <div className="welcome-privacy"><LockKeyhole size={15} />Tanpa akun. Percakapan dihapus saat sesi berakhir.</div>
                </div>
                <div className="welcome-art" aria-hidden="true">
                  <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
                  <div className="art-flower"><HandHeart size={91} strokeWidth={1.1} /></div>
                  <div className="floating-bubble bubble-one"><span><UserRound size={15} />Pengunjung</span>Saya ingin mendaftar.<i>✓</i></div>
                  <div className="floating-bubble bubble-two"><span><Hospital size={15} />Petugas</span>Mari, saya bantu.<Heart size={16} /></div>
                  <span className="art-spark spark-one">✦</span><span className="art-spark spark-two">✦</span>
                  <div className="art-caption">Satu ruang. Dua arah. Saling memahami.</div>
                </div>
              </section>
              <div className="section-intro"><h2>Komunikasi sesuai caramu</h2><span>Sederhana, dari awal sampai selesai.</span></div>
              <div className="intro-cards">
                <div className="intro-card"><span className="intro-icon green"><LayoutGrid size={23} /></span><h3>Pilih atau tuliskan</h3><p>Gunakan frasa siap pakai atau ketik kebutuhan dengan kata-katamu sendiri.</p><span className="step-label">01 <span>PESAN DARI KAMU</span></span></div>
                <div className="intro-card"><span className="intro-icon peach"><MessageSquare size={23} /></span><h3>Baca balasan petugas</h3><p>Pesan dan balasan tampil jelas dalam satu percakapan di layar yang sama.</p><span className="step-label">02 <span>SALING MEMAHAMI</span></span></div>
                <div className="intro-card"><span className="intro-icon lavender"><UsersRound size={23} /></span><h3>Bantuan selalu dekat</h3><p>Tunjukkan kepada petugas jika kamu membutuhkan pendamping atau penerjemah.</p><span className="step-label">03 <span>DIDAMPINGI MANUSIA</span></span></div>
              </div>
              <div className="privacy-strip"><ShieldCheck size={21} /><p><strong>Privasi sejak sapaan pertama.</strong> Kamera hanya aktif atas izinmu. Percakapan tidak disimpan.</p><button onClick={() => setDialog('about')}>Tentang prototipe<ArrowUpRight size={16} /></button></div>
            </>
          ) : (
            <>
              <div className="session-toolbar"><div><span className="small-status"><LockKeyhole size={14} />Percakapan sementara</span><span className="same-device">Pasien dan petugas berbagi layar ini</span></div><button className="text-button end-button" onClick={() => setDialog('end')}><LogOut size={16} />Akhiri sesi</button></div>
              <div className="communication-grid">
                <section className="panel patient-panel" aria-labelledby="patient-heading">
                  <div className="panel-heading"><div className="person-heading"><span className="person-icon"><UserRound size={21} /></span><div><span className="overline">UNTUK PASIEN</span><h2 ref={headingRef} tabIndex={-1} id="patient-heading">Apa yang kamu butuhkan?</h2></div></div><span className="panel-step">01</span></div>
                  <div className="mode-tabs" role="group" aria-label="Cara menyampaikan pesan">
                    {modeButtons.map(({ id, label, icon: Icon }) => <button key={id} className={mode === id ? 'mode-tab active' : 'mode-tab'} aria-pressed={mode === id} onClick={() => changeMode(id)}><Icon size={18} /><span>{label}</span></button>)}
                  </div>
                  <div className="patient-content">
                    {mode === 'phrases' && <>
                      <p className="input-hint">Pilih frasa, periksa pesannya, lalu tunjukkan ke petugas.</p>
                      <div className="category-filters" role="group" aria-label="Kategori frasa">{categories.map(item => <button key={item.id} onClick={() => setCategory(item.id)} aria-pressed={category === item.id} className={category === item.id ? 'filter active' : 'filter'}>{item.label}</button>)}</div>
                      <div className="phrase-grid">{phrases.filter(item => category === 'all' || item.category === category).map(item => {
                        const Icon = phraseIcons[item.icon];
                        return <button key={item.id} className={`phrase-card${draft === item.text ? ' chosen' : ''}`} onClick={() => selectPhrase(item.text)} aria-label={item.text} aria-pressed={draft === item.text}><Icon size={22} strokeWidth={1.6} /><span>{item.title}</span>{draft === item.text && <Check size={14} className="phrase-check" />}</button>;
                      })}</div>
                    </>}
                    {mode === 'type' && <div className="type-intro"><span className="intro-icon green"><Keyboard size={26} /></span><h3>Ceritakan dengan kata-katamu.</h3><p>Tulis kebutuhan layananmu di bawah. Kamu bisa memeriksa dan mengubah pesan sebelum ditampilkan.</p></div>}
                    {mode === 'sign' && <>
                      <PackGate verdict={pack.verdict} recheck={pack.recheck}
                        onUsePhrases={() => changeMode('phrases')} onType={() => changeMode('type')}
                        onRequestInterpreter={() => setDialog('help')}>
                        <CameraPanel onUsePhrases={() => changeMode('phrases')} onSample={frames => handleSignSample(frames)} />
                        {signResult && <SignResult result={signResult} onConfirm={confirmSign} onRetry={retrySign}
                          onChoosePhrase={() => changeMode('phrases')} onType={() => changeMode('type')}
                          onRequestInterpreter={() => { setSignResult(null); setDialog('help'); }} />}
                      </PackGate>
                    </>}
                    {mode !== 'sign' && <form className="draft-box" onSubmit={(e: FormEvent) => { e.preventDefault(); sendMessage('patient', draft); }}>
                      <div className="draft-label"><label htmlFor="patient-draft">{draft ? 'Sudah sesuai dengan maksudmu?' : 'Pesan yang ingin disampaikan'}</label><span>{draft.length}/1000</span></div>
                      <textarea ref={draftRef} id="patient-draft" placeholder="Pilih frasa di atas atau tulis pesan di sini…" value={draft} onChange={e => setDraft(e.target.value)} maxLength={1000} rows={3} />
                      <button className="button primary send-patient" type="submit" disabled={!draft.trim()}><Check size={18} />Ya, tampilkan pesan<ArrowRight size={17} /></button>
                    </form>}
                  </div>
                  <div className="patient-footer"><HandHeart size={17} /><span>Butuh didampingi?</span><button onClick={() => setDialog('help')}>Minta bantuan<ArrowUpRight size={15} /></button></div>
                </section>

                <section className="panel conversation-panel" aria-labelledby="conversation-heading">
                  <div className="panel-heading"><div className="person-heading"><span className="person-icon light"><MessageCircle size={21} /></span><div><span className="overline">SALING MEMAHAMI</span><h2 id="conversation-heading">Percakapan kita</h2></div></div><span className="message-count">{session.messages.length} pesan</span></div>
                  {session.assistance && <div className="assistance-banner" role="status"><UsersRound size={21} /><div><strong>{session.assistance === 'interpreter' ? 'Penerjemah BISINDO dibutuhkan' : 'Bantuan petugas dibutuhkan'}</strong><p>Permintaan hanya tampil di layar ini. Petugas perlu mengatur bantuan secara langsung.</p><button onClick={() => { dispatch({ type: 'RESOLVE_ASSISTANCE' }); setAnnouncement('Petugas menandai permintaan sudah ditangani.'); }}><CheckCheck size={15} />Petugas: tandai ditangani</button></div></div>}
                  <div className="conversation-list" ref={conversationRef} role="log" aria-label="Percakapan pasien dan petugas" aria-live="polite" aria-relevant="additions" tabIndex={0}>
                    {session.messages.length === 0 ? <div className="empty-conversation"><div className="empty-chat-icon"><MessageCircle size={31} strokeWidth={1.4} /><span><Heart size={13} /></span></div><h3>Dimulai dari satu sapaan.</h3><p>Pesanmu dan balasan petugas akan tampil di sini, agar mudah dibaca bersama.</p><div><LockKeyhole size={13} />Hanya untuk sesi ini</div></div> : <>
                      <div className="conversation-divider"><span>Sesi komunikasi dimulai</span></div>
                      {session.messages.map(message => <div key={message.id} className={`message ${message.role}`}><div className="message-author">{message.role === 'patient' ? <UserRound size={13} /> : <Hospital size={13} />}{message.role === 'patient' ? 'Pasien' : 'Petugas'}</div><p>{message.text}</p>{message.role === 'patient' && <button className="message-speak" onClick={() => speak(message.text)} aria-label="Bacakan ulang pesan pasien"><Volume2 size={15} /></button>}</div>)}
                      <div className="conversation-end"><ArrowDown size={12} />Pesan terbaru</div>
                    </>}
                  </div>
                  <form className="staff-composer" onSubmit={(e: FormEvent) => { e.preventDefault(); sendMessage('staff', staffDraft); }}>
                    <div className="staff-heading"><span><Hospital size={16} />BALASAN PETUGAS</span><span>Lokasi pada contoh bersifat fiktif</span></div>
                    <div className="staff-templates">{staffResponses.map(item => <button type="button" key={item.label} onClick={() => setStaffDraft(item.text)}>{item.label}<Plus size={12} /></button>)}</div>
                    <StaffSpeechInput draft={staffDraft} onUse={setStaffDraft} context={`${mode}:${dialog ?? "none"}`} />
                    <label htmlFor="staff-draft" className="sr-only">Balasan petugas</label>
                    <textarea id="staff-draft" value={staffDraft} onChange={e => setStaffDraft(e.target.value)} placeholder="Tulis balasan untuk pasien…" maxLength={1000} rows={3} />
                    <div className="staff-actions"><span>Periksa isi balasan sebelum dikirim.</span><button className="button primary compact" type="submit" disabled={!staffDraft.trim()}>Kirim balasan<Send size={16} /></button></div>
                  </form>
                </section>
              </div>
              <div className="session-bottom"><span><ShieldCheck size={16} />Untuk pendaftaran, informasi lokasi, dan bantuan komunikasi.</span><span>Percakapan medis memerlukan petugas atau penerjemah.</span></div>
            </>
          )}
          <footer className="page-footer"><span>sapa<span className="brand-dot">.</span> <span>Akses komunikasi sejak pintu pertama.</span></span><span><a href="#bisindo">Demo riset BISINDO ↗</a> · <a href="#dataset" aria-label="Studio Dataset untuk tim">Studio Dataset ↗</a></span></footer>
        </main>
      </div>

      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      {dialog === 'end' && <Modal title="Selesaikan percakapan?" onClose={() => setDialog(null)}><div className="modal-symbol"><LockKeyhole size={27} /></div><p>Seluruh pesan, draf, dan permintaan bantuan pada sesi ini akan dihapus. Kamu bisa memulai sesi baru setelahnya.</p><div className="modal-actions"><button className="button secondary" onClick={() => setDialog(null)}>Lanjutkan sesi</button><button className="button primary" onClick={endSession}>Hapus dan akhiri sesi</button></div></Modal>}
      {dialog === 'help' && <Modal title="Kami bantu sampaikan." onClose={() => setDialog(null)}><p>Pilih bantuan yang kamu butuhkan. Permintaan akan terlihat oleh petugas pada layar ini.</p><div className="help-options"><button onClick={() => requestAssistance('staff')}><span className="intro-icon green"><UsersRound size={24} /></span><span><strong>Saya perlu bantuan petugas</strong><small>Untuk mendampingi proses layanan.</small></span><ChevronRight size={20} /></button><button onClick={() => requestAssistance('interpreter')}><span className="intro-icon lavender"><Hand size={24} /></span><span><strong>Saya perlu penerjemah BISINDO</strong><small>Petugas membantu mengatur pendampingan.</small></span><ChevronRight size={20} /></button></div><div className="modal-note"><CircleHelp size={17} />Prototipe belum terhubung ke layanan pemanggilan. Tunjukkan permintaan ini kepada petugas.</div></Modal>}
      {dialog === 'about' && <Modal title="Mengenal SAPA Care" onClose={() => setDialog(null)}><div className="about-brand"><HandHeart size={35} /><span>Akses komunikasi<br /><strong>sejak pintu pertama.</strong></span></div><p>SAPA membantu komunikasi dua arah antara pasien Tuli dan petugas untuk kebutuhan nonklinis di rumah sakit.</p><div className="about-items"><div><Check size={19} /><p><strong>Sudah bisa dicoba</strong>Pilih frasa, ketik, baca balasan, dan coba pratinjau titik gerak dengan kamera. Ada pula contoh alur isyarat ke teks dengan konfirmasi sebelum pesan tampil.</p></div><div><Clock3 size={19} /><p><strong>Contoh teknis, bukan BISINDO tervalidasi</strong>Model pengenal yang dipasang adalah contoh berbasis aturan untuk menguji alur aplikasi. Hasil ragu tidak pernah ditebak, dan semua hasil butuh konfirmasi. Reviewer serta varian BISINDO belum ditentukan.</p></div><div className="about-provenance"><span className="provenance-title"><Database size={17} />Asal-usul model (BOT Chain)</span><div className="provenance-row"><span>Pack terpasang</span><strong>{LANGUAGE_PACK.packId} · v{LANGUAGE_PACK.version}</strong></div><div className="provenance-row"><span>Model & intents</span><strong>{LANGUAGE_PACK.model.id}</strong></div><div className="provenance-row"><span>Status di kiosk</span><strong data-testid="about-pack-status">{packStatusLabel}</strong></div><div className="provenance-row"><span>On-chain (uji)</span><strong>Simulasi lokal — BOT Chain testnet belum di-deploy</strong></div><p className="provenance-note">Kiosk memeriksa kecocokan hash model dan intents dengan catatan pack sebelum mengaktifkan mode isyarat. Catatan on-chain tidak memuat teks percakapan, foto, atau data kesehatan.</p></div><div><ShieldCheck size={19} /><p><strong>Percakapan bersifat sementara</strong>Pesan hanya berada di memori halaman. Kamera memproses video dan titik gerak sementara di perangkat tanpa menyimpan atau mengunggahnya. Kamera berhenti saat keluar dari mode isyarat, halaman tersembunyi, atau sesi diakhiri. Mikrofon opsional untuk draf balasan petugas; audio dapat diproses oleh layanan penyedia browser setelah persetujuan. SAPA tidak menyimpan rekaman audio.</p></div></div><p className="modal-note">Prototipe dengan data lokasi contoh. Gunakan pendamping manusia untuk percakapan medis.</p><button className="button primary full-width" onClick={() => setDialog(null)}>Mengerti<Check size={17} /></button></Modal>}
    </div>
  );
}
