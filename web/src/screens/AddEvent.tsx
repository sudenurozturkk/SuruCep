import { useState } from 'react';
import { REMINDER_META } from '../data/catalog';
import type { EventType, ReminderType } from '../data/types';
import { addDays, fmtDate } from '../lib/date';
import { useStore } from '../store';
import EventEditor, { TYPES, draftError, emptyDraft, useSaveDraft } from '../ui/EventEditor';
import { Btn, Card, Chip, Screen } from '../ui/kit';

/** vet=true → FR-19: veteriner kaydı otomatik "Veteriner onaylı" olur */
export default function AddEvent({ animalId, type, vet }: { animalId: number; type?: string; vet?: boolean }) {
  const { today, animal, farm } = useStore();
  const initType = TYPES.includes(type as EventType) ? (type as EventType) : null;
  const [mode, setMode] = useState<'event' | 'reminder'>('event');
  const [draft, setDraft] = useState(() => emptyDraft(today, animalId, initType));
  const save = useSaveDraft();
  const err = draftError(draft);

  return (
    <Screen title={`${animal(animalId)?.name ?? ''} · ${vet ? 'Veteriner kaydı' : 'Olay ekle'}`}>
      {vet && (
        <Card style={{ background: 'var(--vet-bg)' }}>
          <span className="bold" style={{ color: 'var(--vet)' }}>🩺 {farm.vet_name}</span>
          <span className="small muted">Bu kayıt "Veteriner onaylı" olarak işaretlenecek.</span>
        </Card>
      )}
      {!vet && (
        <div className="role-seg" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <button className={mode === 'event' ? 'on' : ''} onClick={() => setMode('event')}><span>📝</span>Olay kaydı</button>
          <button className={mode === 'reminder' ? 'on' : ''} onClick={() => setMode('reminder')}><span>⏰</span>Hatırlatma ekle</button>
        </div>
      )}

      {mode === 'event' ? (
        <>
          <EventEditor draft={draft} onChange={setDraft} />
          {err && <div className="center muted">{err}</div>}
          <Btn
            big
            icon="💾"
            label={vet ? 'Onayla ve kaydet' : 'Kaydet'}
            color={vet ? 'var(--vet)' : undefined}
            disabled={!!err}
            onClick={() => save(draft, 'manual', vet ? { verifiedBy: farm.vet_name, next: `/pasaport/${animalId}/vet` } : {})}
          />
        </>
      ) : (
        <ReminderForm animalId={animalId} />
      )}
    </Screen>
  );
}

const MANUAL: ReminderType[] = ['vet_check', 'treatment_followup'];
const WHEN = [1, 3, 7, 14, 30];

/** Ek 2: veteriner kontrolü ve tedavi takibi elle eklenebilir */
function ReminderForm({ animalId }: { animalId: number }) {
  const st = useStore();
  const [type, setType] = useState<ReminderType>('vet_check');
  const [days, setDays] = useState(3);
  const [note, setNote] = useState('');
  const due = addDays(st.today, days);

  const save = () => {
    st.addReminder({ animal_id: animalId, type, due_date: due, note: note.trim() || null });
    st.showBanner({ icon: '⏰', title: `${REMINDER_META[type].label} eklendi`, body: `${fmtDate(due)} tarihinde takvimde görünecek.`, tone: 'green' });
    st.replace(`/hayvan/${animalId}`);
  };

  return (
    <div className="col" style={{ gap: 18 }}>
      <div className="col">
        <b>Ne hatırlatılsın?</b>
        <div className="wrap">
          {MANUAL.map((t) => <Chip key={t} icon={REMINDER_META[t].icon} label={REMINDER_META[t].label} on={type === t} onClick={() => setType(t)} />)}
        </div>
      </div>
      <div className="col">
        <b>Ne zaman?</b>
        <div className="wrap">
          {WHEN.map((d) => <Chip key={d} label={d === 1 ? 'Yarın' : `${d} gün sonra`} on={days === d} onClick={() => setDays(d)} />)}
        </div>
        <span className="small muted">📅 {fmtDate(due)}</span>
      </div>
      <div className="col">
        <b>Not (isteğe bağlı)</b>
        <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Örn: mastitis kontrolü" />
      </div>
      <Btn big icon="⏰" label="Hatırlatmayı kaydet" onClick={save} />
    </div>
  );
}
