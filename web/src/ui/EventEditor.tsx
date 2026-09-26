import { Fragment } from 'react';
import { EVENT_META, REMINDER_META } from '../data/catalog';
import type { EventSource, EventType } from '../data/types';
import { addDays, fmtDate } from '../lib/date';
import { useStore } from '../store';
import { Chip } from './kit';

export interface Draft {
  animalId: number | null;
  type: EventType | null;
  date: string;
  value: string;
  drugId: number | null;
  drugCandidates?: number[];
  cost: string;
  note: string;
}

export const TYPES: EventType[] = ['milk', 'vaccine', 'insemination', 'birth', 'treatment', 'feed', 'check'];

export function emptyDraft(today: string, animalId: number | null = null, type: EventType | null = null): Draft {
  return { animalId, type, date: today, value: '', drugId: null, cost: '', note: '' };
}

export function draftError(d: Draft): string | null {
  if (!d.animalId) return 'Hayvan seçin';
  if (!d.type) return 'Olay türü seçin';
  if (d.type === 'milk' && !(parseFloat(d.value.replace(',', '.')) > 0)) return 'Süt miktarını girin';
  if ((d.type === 'treatment' || d.type === 'vaccine') && !d.drugId) return d.type === 'treatment' ? 'İlacı seçin' : 'Aşıyı seçin';
  return null;
}

/** Olayı kaydeder, oluşan hatırlatmaları bantta gösterir ve ilgili ekrana gider. */
export function useSaveDraft() {
  const st = useStore();
  return (d: Draft, source: EventSource, opts: { verifiedBy?: string; next?: string } = {}) => {
    const drug = st.drug(d.drugId);
    const value = d.type === 'milk' || d.type === 'feed' ? parseFloat(d.value.replace(',', '.')) || null : null;
    let cost = parseFloat(d.cost.replace(',', '.'));
    if (!(cost >= 0)) cost = drug?.price ?? 0;
    const created = st.addEvent({
      animal_id: d.animalId!,
      type: d.type!,
      date: d.date,
      value,
      unit: d.type === 'milk' ? 'lt' : d.type === 'feed' && value ? 'kg' : null,
      drug_id: d.drugId,
      cost: cost || null,
      note: d.note || null,
      source,
      verified_by: opts.verifiedBy ?? null,
      verified_at: opts.verifiedBy ? st.today : null,
    });
    const a = st.animal(d.animalId!);
    const m = EVENT_META[d.type!];
    const lines: string[] = [];
    if (opts.verifiedBy) lines.push(`🩺 ${opts.verifiedBy} tarafından onaylandı.`);
    if (d.type === 'milk') lines.push(`${value} litre süt grafiğe eklendi.`);
    if (drug && d.type === 'treatment' && drug.milk_withdrawal_days > 0) {
      lines.push(`🚫 Süt ${drug.milk_withdrawal_days} gün satılamaz (${fmtDate(addDays(d.date, drug.milk_withdrawal_days))} tarihine kadar).`);
    }
    if (created.length) {
      lines.push(`${created.length} hatırlatma otomatik oluşturuldu:`);
      for (const r of created) lines.push(`${REMINDER_META[r.type].icon} ${REMINDER_META[r.type].label} — ${fmtDate(r.due_date)}`);
    }
    st.showBanner({
      icon: '✅',
      title: `${a?.name}: ${m.label} kaydedildi`,
      body: lines.join('\n') || 'Kayıt eklendi.',
      tone: d.type === 'treatment' && drug?.milk_withdrawal_days ? 'red' : 'green',
    });
    st.replace(opts.next ?? `/hayvan/${d.animalId}`);
  };
}

export default function EventEditor({ draft, onChange, pickAnimal }: { draft: Draft; onChange: (d: Draft) => void; pickAnimal?: boolean }) {
  const { animals, drugs, today } = useStore();
  const set = (p: Partial<Draft>) => onChange({ ...draft, ...p });
  const animal = animals.find((a) => a.id === draft.animalId);
  // Aşılar hayvanın türüne ve cinsiyetine göre süzülür (ör. Brusella S19 yalnız dişi sığır)
  const pool =
    draft.type === 'treatment' || draft.type === 'vaccine'
      ? drugs.filter((d) =>
          d.kind === (draft.type === 'vaccine' ? 'vaccine' : 'drug') &&
          (!animal || d.kind === 'drug' || (d.species.split(',').includes(animal.species) && (!d.female_only || animal.sex === 'disi'))))
      : [];
  const selected = drugs.find((d) => d.id === draft.drugId);
  const lactating = animal?.sex === 'disi' && animal.purpose === 'sut';
  // Sesli girişte aday ilaçlar (örn. "antibiyotik") önce gösterilir
  const cands = draft.drugCandidates?.length ? pool.filter((d) => draft.drugCandidates!.includes(d.id)) : [];
  const rest = pool.filter((d) => !cands.includes(d));

  return (
    <div className="col" style={{ gap: 18 }}>
      {pickAnimal && (
        <div className="col">
          <b>Hangi hayvan?</b>
          <div className="wrap">
            {animals.map((a) => (
              <Chip key={a.id} label={a.name} on={draft.animalId === a.id} onClick={() => set({ animalId: a.id })} />
            ))}
          </div>
        </div>
      )}

      <div className="col">
        <b>Ne oldu?</b>
        <div className="wrap">
          {TYPES.map((t) => (
            <Chip key={t} icon={EVENT_META[t].icon} label={EVENT_META[t].label} on={draft.type === t} onClick={() => set({ type: t, drugId: null })} />
          ))}
        </div>
      </div>

      <div className="col">
        <b>Ne zaman?</b>
        <div className="wrap">
          {[0, -1, -2].map((n) => {
            const d = addDays(today, n);
            return <Chip key={n} label={n === 0 ? 'Bugün' : n === -1 ? 'Dün' : '2 gün önce'} on={draft.date === d} onClick={() => set({ date: d })} />;
          })}
        </div>
      </div>

      {draft.type === 'milk' && (
        <div className="col">
          <b>Kaç litre?</b>
          <div className="row">
            <input className="input" style={{ width: 130 }} inputMode="decimal" value={draft.value} placeholder="0" onChange={(e) => set({ value: e.target.value })} />
            <span className="big">litre</span>
          </div>
        </div>
      )}

      {(draft.type === 'treatment' || draft.type === 'vaccine') && (
        <div className="col">
          <b>{draft.type === 'vaccine' ? 'Hangi aşı?' : 'Hangi ilaç?'}</b>
          {cands.length > 0 && <span className="small muted">Söylediğinize uyanlar:</span>}
          {[...cands, ...rest].map((d, i) => (
            <Fragment key={d.id}>
              {cands.length > 0 && i === cands.length && <span className="small muted">Diğerleri:</span>}
              <Chip
                label={`${d.name}${d.kind === 'drug' ? ` · süt ${d.milk_withdrawal_days} gün` : d.repeat_days ? ` · ${d.repeat_days} günde bir` : ''}`}
                on={draft.drugId === d.id}
                onClick={() => set({ drugId: d.id })}
              />
            </Fragment>
          ))}
          {selected && (
            <div className={`tip ${selected.kind === 'drug' && (selected.milk_withdrawal_days || selected.meat_withdrawal_days) ? 'red' : ''}`}>
              {selected.kind === 'drug' ? (
                <>
                  <b>🚫 Arınma: süt {selected.milk_withdrawal_days ? `${selected.milk_withdrawal_days} gün` : 'yok'} · et {selected.meat_withdrawal_days ? `${selected.meat_withdrawal_days} gün` : 'yok'}</b>
                  {selected.note && <span>{selected.note}</span>}
                  {lactating && /KULLANILMAZ/.test(selected.note ?? '') && <span className="bold c-red">⚠️ Bu hayvan sağmal: bu ilaç sağmal hayvanda kullanılmaz. Veterinerinize danışın.</span>}
                </>
              ) : (
                <>
                  <b>📅 {selected.schedule}</b>
                  {selected.note && <span>{selected.note}</span>}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {(draft.type === 'treatment' || draft.type === 'vaccine' || draft.type === 'feed') && (
        <div className="col">
          <b>Masraf (₺)</b>
          <input
            className="input"
            style={{ width: 170 }}
            inputMode="decimal"
            value={draft.cost}
            placeholder={draft.drugId ? String(drugs.find((d) => d.id === draft.drugId)?.price ?? '') : '0'}
            onChange={(e) => set({ cost: e.target.value })}
          />
        </div>
      )}

      <div className="col">
        <b>Not (isteğe bağlı)</b>
        <input className="input" value={draft.note} placeholder="Örn: sağ arka meme" onChange={(e) => set({ note: e.target.value })} />
      </div>
    </div>
  );
}
