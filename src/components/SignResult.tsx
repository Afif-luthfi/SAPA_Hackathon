import { Check, Hand, Info, Keyboard, LayoutGrid, Repeat2 } from 'lucide-react';
import type { RecognitionResult } from '../intent/model';
import { intentText } from '../intent/model';
import { bandLabel } from '../intent/policy';
import type { IntentId } from '../intent/intents';

interface SignResultProps {
  result: RecognitionResult;
  onConfirm: (intentId: IntentId) => void;
  onRetry: () => void;
  onChoosePhrase: () => void;
  onType: () => void;
  onRequestInterpreter: () => void;
}

export function SignResult({
  result, onConfirm, onRetry, onChoosePhrase, onType, onRequestInterpreter,
}: SignResultProps) {
  const uncertain = result.band === 'uncertain';

  return (
    <section className="sign-result" aria-labelledby="sign-result-title" data-testid="sign-result">
      <div className="sign-result-heading">
        <span className={`sign-band ${result.band}`}>{bandLabel(result.band)}</span>
        <div>
          <h3 id="sign-result-title">{result.band === 'low' ? 'Belum dikenali' : uncertain ? 'Pilih hasil yang sesuai' : 'Hasil isyarat'}</h3>
          <p>{result.band === 'low'
            ? 'Aplikasi tidak menebak isyarat yang tidak dikenali.'
            : 'Periksa hasil di bawah ini sebelum dikirim kepada petugas.'}</p>
        </div>
      </div>

      {result.band === 'low' ? (
        <div className="sign-fallback">
          <p>Coba ulangi isyarat, atau gunakan salah satu cara lain berikut.</p>
          <div className="sign-fallback-actions">
            <button onClick={onRetry}><Repeat2 size={18} />Ulangi isyarat</button>
            <button onClick={onChoosePhrase}><LayoutGrid size={18} />Pilih frasa</button>
            <button onClick={onType}><Keyboard size={18} />Ketik pesan</button>
            <button onClick={onRequestInterpreter}><Hand size={18} />Minta penerjemah</button>
          </div>
        </div>
      ) : (
        <div className="sign-candidates">
          {result.candidates.map((candidate, index) => (
            <button
              key={candidate.intentId}
              className={`sign-candidate${index === 0 ? ' primary' : ''}`}
              onClick={() => onConfirm(candidate.intentId)}
            >
              <span>{intentText(candidate.intentId)}</span>
              {index === 0 ? <><Check size={18} />{uncertain ? 'Pilih' : 'Benar'}</> : <span>Pilih</span>}
            </button>
          ))}
          <button className="text-button sign-retry" onClick={onRetry}>Bukan ini — ulangi isyarat</button>
        </div>
      )}

      <p className="sign-model-note" role="status">
        <Info size={14} />
        <span>{result.note} Model {result.modelVersion} · region {result.region}.</span>
      </p>
    </section>
  );
}