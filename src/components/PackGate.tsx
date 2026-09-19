import { type ReactNode } from 'react';
import { CircleHelp, Clock3, LayoutGrid, RefreshCcw, ShieldCheck, Hand, Keyboard, TriangleAlert } from 'lucide-react';
import type { PackVerdict } from '../chain/pack';

interface PackGateProps {
  verdict: PackVerdict;
  recheck: () => Promise<void>;
  onUsePhrases: () => void;
  onType: () => void;
  onRequestInterpreter: () => void;
  children: ReactNode;
}

const BLOCKED_COPY: Record<'hash-mismatch' | 'deprecated' | 'not-listed' | 'unavailable' | 'no-active', string> = {
  'hash-mismatch': 'File model telah berubah dan tidak cocok dengan catatan pack. Pengenalan isyarat dinonaktifkan.',
  deprecated: 'Pack ini sudah dinonaktifkan validator. Pengenalan isyarat dinonaktifkan.',
  'not-listed': 'Pack tidak tercatat pada registry. Pengenalan isyarat dinonaktifkan.',
  unavailable: 'Pemeriksaan pack tidak dapat dilakukan saat ini. Pengenalan isyarat dinonaktifkan agar tidak mengklaim status yang tidak dapat dipastikan.',
  'no-active': 'Belum ada pack aktif pada registry. Pengenalan isyarat dinonaktifkan.',
};

export function PackGate({ verdict, recheck, onUsePhrases, onType, onRequestInterpreter, children }: PackGateProps) {
  if (verdict.state === 'checking') {
    return <p className="pack-gate pack-checking" data-testid="pack-gate-checking" role="status">Memeriksa pack kesesuaian model…<button onClick={() => void recheck()} aria-label="Periksa ulang pack">Ulang</button></p>;
  }

  if (verdict.state === 'verified') {
    return <>
      <div className="pack-gate verified" data-testid="pack-gate-verified" role="status"><ShieldCheck size={18} /><p><strong>Model contoh cocok dengan pack aktif.</strong> Disetujui 2 dari 3 validator. Persetujuan ini simulasi lokal; kontrak belum di-deploy.</p><button onClick={() => void recheck()} aria-label="Periksa ulang pack"><RefreshCcw size={14} />Periksa ulang</button></div>
      {children}
    </>;
  }

  if (verdict.state === 'pending') {
    return <>
      <div className="pack-gate pending" data-testid="pack-gate-pending" role="status"><Clock3 size={18} /><p><strong>Pack contoh belum disetujui validator.</strong> Pengenalan tetap tersedia untuk menguji alur dan belum tervalidasi.</p><button onClick={() => void recheck()} aria-label="Periksa ulang pack"><RefreshCcw size={14} />Periksa ulang</button></div>
      {children}
    </>;
  }

  return (
    <section className="pack-gate blocked" data-testid="pack-gate-blocked" role="alert">
      <TriangleAlert size={19} />
      <div>
        <strong>Pemeriksaan pack menolak pengenalan</strong>
        <p>{BLOCKED_COPY[verdict.state === 'blocked' ? verdict.reason : 'unavailable']}</p>
        <div className="pack-gate-actions">
          <button onClick={onUsePhrases}><LayoutGrid size={16} />Gunakan frasa</button>
          <button onClick={onType}><Keyboard size={16} />Ketik pesan</button>
          <button onClick={onRequestInterpreter}><Hand size={16} />Minta penerjemah</button>
          <button onClick={() => void recheck()}>Periksa ulang<CircleHelp size={15} /></button>
        </div>
      </div>
    </section>
  );
}