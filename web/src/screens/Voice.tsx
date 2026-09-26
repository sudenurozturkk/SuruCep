import { useEffect, useRef, useState } from 'react';
import { EVENT_META } from '../data/catalog';
import { fmtDate } from '../lib/date';
import { speechAvailable, startListening } from '../lib/speech';
import { DEMO_SENTENCES, parseSentence } from '../logic/parser';
import { useStore } from '../store';
import EventEditor, { type Draft, draftError, useSaveDraft } from '../ui/EventEditor';
import { Btn, Card, Chip, Screen } from '../ui/kit';

type Phase = 'idle' | 'listening' | 'confirm';

/** animalId: QR'dan gelindiyse cümlede hayvan adı söylenmese de o hayvan seçili olur */
export default function Voice({ animalId }: { animalId?: number }) {
  const { animals, drugs, today, drug } = useStore();
  const save = useSaveDraft();
  const [phase, setPhase] = useState<Phase>('idle');
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editing, setEditing] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const fixed = animalId ? animals.find((a) => a.id === animalId) : undefined;
  // Ek 2: Web Speech API internet ister — çevrimdışıyken mikrofon pasif, yazarak giriş önerilir
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  const micOk = online && speechAvailable;

  useEffect(() => () => stopRef.current(), []);

  const analyze = (sentence: string) => {
    const t = sentence.trim();
    if (!t) return;
    const r = parseSentence(t, animals, drugs, today);
    const aid = r.animalId ?? fixed?.id ?? null;
    setText(t);
    setDraft({
      animalId: aid,
      type: r.type,
      date: r.date,
      value: r.value != null ? String(r.value) : '',
      drugId: r.drugId,
      drugCandidates: r.drugCandidates,
      cost: r.cost != null ? String(r.cost) : '',
      note: '',
    });
    // Eksik bilgi varsa (ör. hangi antibiyotik) doğrudan düzenleme açılır
    setEditing(!aid || !r.type || ((r.type === 'treatment' || r.type === 'vaccine') && !r.drugId));
    setPhase('confirm');
  };

  const listen = () => {
    setError(null);
    setText('');
    setPhase('listening');
    let finalText = '';
    stopRef.current = startListening({
      onPartial: (t) => setText(t),
      onFinal: (t) => { finalText = t; setText(t); },
      onError: (m) => setError(m),
      onEnd: () => {
        if (finalText) analyze(finalText);
        else setPhase('idle');
      },
    });
  };

  const a = draft?.animalId ? animals.find((x) => x.id === draft.animalId) : undefined;
  const err = draft ? draftError(draft) : null;
  const d = draft ? drug(draft.drugId) : undefined;

  return (
    <Screen title={fixed ? `🎤 ${fixed.name} · sesli kayıt` : '🎤 Sesli kayıt'}>
      {phase !== 'confirm' && (
        <>
          <div className="col" style={{ alignItems: 'center', gap: 16, padding: '16px 0' }}>
            <button
              className={`mic-big ${phase === 'listening' ? 'live' : ''}`}
              onClick={phase === 'listening' ? () => stopRef.current() : listen}
              disabled={!micOk && phase !== 'listening'}
              style={!micOk ? { background: '#b0aa9c', cursor: 'not-allowed' } : undefined}
              aria-label={phase === 'listening' ? 'Dinlemeyi durdur' : 'Konuşmaya başla'}
            >
              {phase === 'listening' ? '⏹️' : '🎤'}
            </button>
            <div className="h2 center">{phase === 'listening' ? 'Dinliyorum…' : micOk ? 'Dokun ve konuş' : online ? 'Mikrofon desteklenmiyor' : '📴 İnternet yok'}</div>
            {!online && <div className="center c-yellow bold">Sesli kayıt internet ister. Aşağıdan yazın veya örnek cümle seçin — kayıt yine cihaza kaydedilir.</div>}
            {text
              ? <div className="center bold" style={{ fontSize: 22, color: 'var(--primary-dark)' }}>"{text}"</div>
              : <div className="center muted">Örn: "{fixed ? `${fixed.name} bugün 15 litre verdi` : 'Sarıkız bugün 12 litre süt verdi'}"</div>}
            {error && <div className="center c-red">{error}</div>}
            {!speechAvailable && <div className="center xs muted">(Bu tarayıcıda mikrofon tanıma yok — aşağıdan yazabilirsiniz)</div>}
          </div>

          <Card>
            <b>⌨️ Yaz veya örnek seç</b>
            <form className="row" onSubmit={(e) => { e.preventDefault(); analyze(text); }}>
              <input className="input grow" style={{ fontSize: 19 }} value={text} placeholder="Cümleyi yazın…" onChange={(e) => setText(e.target.value)} />
              <Btn label="Anla" onClick={() => analyze(text)} disabled={!text.trim()} />
            </form>
            <div className="wrap" style={{ gap: 8 }}>
              {DEMO_SENTENCES.map((s) => <Chip key={s} label={s} onClick={() => analyze(s)} />)}
            </div>
          </Card>
        </>
      )}

      {phase === 'confirm' && draft && (
        <>
          <Card style={{ background: '#eef5ee' }}>
            <span className="muted">Anladığım cümle:</span>
            <span className="bold" style={{ fontSize: 22 }}>"{text}"</span>
          </Card>

          {!editing ? (
            <Card level={err ? 'yellow' : 'green'}>
              <span className="big">Doğru mu? 🤔</span>
              <Field icon="🐄" label="Hayvan" value={a?.name ?? '—'} />
              <Field icon={draft.type ? EVENT_META[draft.type].icon : '❓'} label="Olay" value={draft.type ? EVENT_META[draft.type].label : '—'} />
              {draft.type === 'milk' && <Field icon="🥛" label="Miktar" value={`${draft.value} litre`} />}
              {d && <Field icon="💊" label={draft.type === 'vaccine' ? 'Aşı' : 'İlaç'} value={d.name} />}
              {d && draft.type === 'treatment' && d.milk_withdrawal_days > 0 && (
                <span className="bold c-red">🚫 Süt {d.milk_withdrawal_days} gün satılamayacak</span>
              )}
              <Field icon="📅" label="Tarih" value={draft.date === today ? 'Bugün' : fmtDate(draft.date)} />
            </Card>
          ) : (
            <Card>
              <span className="bold" style={{ fontSize: 20 }}>Eksikleri tamamlayın</span>
              <EventEditor draft={draft} onChange={setDraft} pickAnimal />
            </Card>
          )}

          {err && <div className="center bold c-yellow">{err}</div>}
          <Btn big icon="✅" label="Evet, kaydet" disabled={!!err} onClick={() => save(draft, 'voice')} />
          <div className="row" style={{ gap: 12 }}>
            {!editing && <Btn outline icon="✏️" label="Düzelt" onClick={() => setEditing(true)} style={{ flex: 1 }} />}
            <Btn outline icon="🎤" label="Tekrar" color="var(--muted)" onClick={() => { setPhase('idle'); setDraft(null); setText(''); }} style={{ flex: 1 }} />
          </div>
        </>
      )}
    </Screen>
  );
}

function Field({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="row">
      <span style={{ fontSize: 26 }}>{icon}</span>
      <span className="muted" style={{ width: 80 }}>{label}</span>
      <span className="grow bold" style={{ fontSize: 22 }}>{value}</span>
    </div>
  );
}
