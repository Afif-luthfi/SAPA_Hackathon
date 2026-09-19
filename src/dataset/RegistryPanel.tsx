import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  BadgeCheck, Check, CircleAlert, Clock3, Database, FileWarning, Layers,
  RotateCcw, ShieldCheck, TriangleAlert, Zap,
} from 'lucide-react';
import {
  getRegistry, isTamperedFiles, resetRegistry, setRegistry, setTamperedFiles,
  subscribeRegistryChanges,
} from '../chain/store';
import {
  approveDeprecation, approvePack, getActivePack, proposeDeprecation, submitPack,
  RegistryError,
} from '../chain/registry';
import { DEMO_REGION, DEMO_VALIDATORS, LANGUAGE_PACK } from '../chain/demoPack';

const VALIDATOR_LABELS: Record<string, string> = {
  'validator-a': 'A · tim SAPA',
  'validator-b': 'B · penutur BISINDO',
  'validator-c': 'C · reviewer medis',
};

type TxState =
  | { state: 'idle' }
  | { state: 'waiting' }
  | { state: 'confirmed'; message: string }
  | { state: 'failed'; message: string };

function toHex(text: string) {
  return '0x' + Array.from(text).map(char => char.charCodeAt(0).toString(16)).join('');
}

export function RegistryPanel() {
  const registry = useSyncExternalStore(subscribeRegistryChanges, getRegistry);
  const [validator, setValidator] = useState(DEMO_VALIDATORS[0]);
  const [packId, setPackId] = useState('');
  const [tx, setTx] = useState<TxState>({ state: 'idle' });

  const packs = registry.packs;
  const activePack = getActivePack(registry, DEMO_REGION);
  const currentPack = packs.find(item => item.packId === packId) ?? packs[0];

  useEffect(() => {
    if (packs.length > 0 && !packs.some(item => item.packId === packId)) {
      setPackId(packs[0].packId);
    }
  }, [packs, packId]);

  const accounts = useMemo(() => [DEMO_VALIDATORS[0], DEMO_VALIDATORS[1], DEMO_VALIDATORS[2]], []);

  function noteWaiting() {
    setTx({ state: 'waiting' });
  }
  function handleApprove() {
    if (!currentPack) return;
    noteWaiting();
    window.setTimeout(() => {
      try {
        const next = approvePack(getRegistry(), currentPack.packId, validator);
        setRegistry(next);
        setTx({ state: 'confirmed', message: `Persetujuan ${validator} (${VALIDATOR_LABELS[validator]}) tercatat (kuorum 2).` });
      } catch (problem) {
        setTx({
          state: 'failed',
          message: problem instanceof RegistryError ? problem.message : 'Persetujuan tidak dapat dicatat.',
        });
      }
    }, 350);
  }

  function handleProposeDeprecation() {
    if (!currentPack) return;
    noteWaiting();
    window.setTimeout(() => {
      try {
        const reason = 'Konten model digantikan versi baru yang sudah disetujui tim.';
        const next = proposeDeprecation(getRegistry(), currentPack.packId, validator, toHex(reason));
        setRegistry(next);
        setTx({ state: 'confirmed', message: `Proposal deprecation dibuat oleh ${validator}. Menunggu persetujuan validator kedua.` });
      } catch (problem) {
        setTx({
          state: 'failed',
          message: problem instanceof RegistryError ? problem.message : 'Proposal deprecation tidak dapat dibuat.',
        });
      }
    }, 350);
  }

  function handleApproveDeprecation() {
    if (!currentPack) return;
    noteWaiting();
    window.setTimeout(() => {
      try {
        const next = approveDeprecation(getRegistry(), currentPack.packId, validator);
        setRegistry(next);
        setTx({ state: 'confirmed', message: `Deprecation disetujui ${validator}. Pack kini Deprecated; kiosk memblokir mode isyarat.` });
      } catch (problem) {
        setTx({
          state: 'failed',
          message: problem instanceof RegistryError ? problem.message : 'Persetujuan deprecation tidak dapat dicatat.',
        });
      }
    }, 350);
  }

  function handleSubmitNewPack() {
    noteWaiting();
    window.setTimeout(() => {
      try {
        const { state: next, packId: id } = submitPack(getRegistry(), {
          regionId: DEMO_REGION,
          hashes: {
            dataset: LANGUAGE_PACK.dataset.sha256,
            model: LANGUAGE_PACK.model.sha256,
            intentSchema: LANGUAGE_PACK.intentSchema.sha256,
          },
          metadataUri: 'sapa-demo-v2',
          proposer: 'team-proposer',
        });
        setRegistry(next);
        setPackId(id);
        setTx({ state: 'confirmed', message: `Versi pack baru ${id} diusulkan dan menunggu 2 persetujuan validator.` });
      } catch (problem) {
        setTx({ state: 'failed', message: problem instanceof RegistryError ? problem.message : 'Pack tidak dapat diusulkan.' });
      }
    }, 350);
  }

  function handleReset() {
    resetRegistry();
    setPackId('');
    setTx({ state: 'idle' });
  }

  const kioskOpen = activePack != null;

  return (
    <section className="studio-card registry-card" aria-labelledby="registry-title">
      <div className="studio-card-heading">
        <span className="studio-step reg-step">04</span>
        <div>
          <h2 id="registry-title">Registry pack · BOT Chain</h2>
          <p>Pencatatan persetujuan model terpakai oleh kiosk. Bagian ini simulasi; kontrak belum di-deploy.</p>
        </div>
        <span className="reg-live-badge"><span className={kioskOpen ? 'status-dot active' : 'status-dot'} />Kiosk: {kioskOpen ? 'pack aktif' : 'tanpa pack aktif'}</span>
      </div>

      <div className="registry-grid">
        <section className="registry-list" aria-labelledby="packlist-title">
          <div className="registry-subhead"><span id="packlist-title">Pack dalam registry</span><select value={currentPack?.packId ?? ''} onChange={e => { setPackId(e.target.value); setTx({ state: 'idle' }); }} aria-label="Pilih pack">{packs.map(item => <option key={item.packId} value={item.packId}>{item.packId} · {item.status}</option>)}</select></div>
          {currentPack && <div className="pack-row" data-testid="current-pack">
            <div className="pack-row-line"><strong>{currentPack.packId}</strong><span className={`reg-status ${currentPack.status.toLowerCase()}`}>{currentPack.status}</span></div>
            <dl>
              <div><dt>Region</dt><dd>{currentPack.regionId} (variasi belum ditetapkan)</dd></div>
              <div><dt>Metadata</dt><dd>{currentPack.metadataUri}</dd></div>
              <div><dt>Diajukan</dt><dd>{currentPack.proposer}</dd></div>
              <div><dt>Persetujuan</dt><dd>{currentPack.approvers.length ? currentPack.approvers.map(item => VALIDATOR_LABELS[item] ?? item).join(', ') : 'belum ada'} — {currentPack.approvalCount}/2 dari kuorum</dd></div>
              {currentPack.deprecation.proposer && <div><dt>Deprecation</dt><dd>Diusulkan {VALIDATOR_LABELS[currentPack.deprecation.proposer] ?? currentPack.deprecation.proposer}; disetujui {currentPack.deprecation.approvers.length} dari 2.</dd></div>}
              {currentPack.activatedAt != null && <div><dt>Diaktifkan</dt><dd>Tanda waktu {currentPack.activatedAt} (satuan contoh)</dd></div>}
            </dl>
            <div className="pack-hashes"><span>model</span><code title={currentPack.hashes.model}>{currentPack.hashes.model.slice(0, 18)}…</code><span>intents</span><code title={currentPack.hashes.intentSchema}>{currentPack.hashes.intentSchema.slice(0, 18)}…</code><span>dataset</span><code title={currentPack.hashes.dataset}>{currentPack.hashes.dataset.slice(0, 18)}…</code></div>
          </div>}
          {!currentPack && <p className="registry-empty">Belum ada pack. Gunakan “Usulkan versi baru”.</p>}
        </section>

        <section className="registry-actions" aria-labelledby="actions-title">
          <div className="registry-subhead"><span id="actions-title">Tindakan validator (2 dari 3)</span></div>
          <div className="validator-picker" role="group" aria-label="Validator yang menandatangani">
            {accounts.map(account => <button key={account} className={validator === account ? 'reg-validator active' : 'reg-validator'} aria-pressed={validator === account} onClick={() => { setValidator(account); setTx({ state: 'idle' }); }}><span className="reg-validator-dot" aria-hidden="true" />{VALIDATOR_LABELS[account]}</button>)}
          </div>
          <div className="registry-buttons">
            <button className="button primary" disabled={!currentPack || currentPack.status !== 'Proposed'} onClick={handleApprove}><Check size={16} />Setujui pack</button>
            <button className="button secondary" disabled={!currentPack || currentPack.status !== 'Active'} onClick={handleProposeDeprecation}><RotateCcw size={16} />Proposal deprecation</button>
            <button className="button secondary" disabled={!currentPack || currentPack.status !== 'Active'} onClick={handleApproveDeprecation}><TriangleAlert size={16} />Setujui deprecation</button>
            <button className="button secondary" onClick={handleSubmitNewPack}><Layers size={16} />Usulkan versi baru</button>
            <button className="button secondary" onClick={handleReset}><Zap size={16} />Kembalikan contoh</button>
          </div>
          <div className={`tx-status ${tx.state === 'failed' ? 'failed' : tx.state === 'confirmed' ? 'confirmed' : ''}`} role="status" aria-live="polite">
            {tx.state === 'idle' && <><Clock3 size={15} />Belum ada transaksi pada sesi ini. Keadaan tercatat hanya di store lokal.</>}
            {tx.state === 'waiting' && <><Clock3 size={15} />Transaksi contoh sedang dicatat…</>}
            {tx.state === 'confirmed' && <><Check size={15} />{tx.message}</>}
            {tx.state === 'failed' && <><CircleAlert size={15} />{tx.message}</>}
          </div>
          <button className={`tamper-toggle${isTamperedFiles() ? ' on' : ''}`} aria-pressed={isTamperedFiles()} onClick={() => { setTamperedFiles(!isTamperedFiles()); setTx({ state: 'idle' }); }}>
            <FileWarning size={16} />Uji penolakan hash: {isTamperedFiles() ? 'file sengaja diubah → kiosk memblokir' : 'simulasikan file model berubah'}
          </button>
          <p className="registry-note"><ShieldCheck size={15} />Alamat validator di atas adalah contoh untuk menguji alur. Tabrakan tanda tangan dan akses nyata hanya berlaku setelah kontrak di-deploy di BOT Chain testnet; sampai saat itu seluruh aktivitas hanya tercatat di memori.</p>
        </section>
      </div>
      <div className="registry-foot"><span><BadgeCheck size={15} />Kuorum persetujuan: 2 dari 3 validator; pack aktif baru menggantikan yang lama untuk region yang sama.</span><span><Database size={15} />On-chain (uji): simulasi lokal · belum ada alamat testnet</span></div>
    </section>
  );
}