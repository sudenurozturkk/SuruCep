import { useRef } from 'react';
import { EVENT_META, REMINDER_META } from '../data/catalog';
import { ageText, fmtDate, fmtShort, relDay } from '../lib/date';
import { fileToThumb } from '../lib/photo';
import { financeFor, milkBlockedOn, milkSeries, money, pregnancyInfo, reminderLevel, withdrawalFor } from '../logic/animal';
import { animalSummary, openWhatsApp } from '../logic/share';
import { useStore } from '../store';
import { QrCard, ShareSettingsCard } from '../ui/QrCard';
import { Avatar, Btn, Card, Disclaimer, FG, Screen, Section, SourceBadge, Tag } from '../ui/kit';

export default function AnimalDetail({ id, showQr }: { id: number; showQr?: boolean }) {
  const st = useStore();
  const { events, reminders, drugs, farm, today, go } = st;
  const fileRef = useRef<HTMLInputElement>(null);
  const a = st.animal(id);
  if (!a) return <Screen title="Bulunamadı"><span>Hayvan bulunamadı.</span></Screen>;

  const w = withdrawalFor(a.id, events, drugs, today);
  const calving = pregnancyInfo(a.id, reminders);
  const upcoming = reminders.filter((r) => r.animal_id === a.id && !r.done).sort((x, y) => x.due_date.localeCompare(y.due_date));
  const history = events.filter((e) => e.animal_id === a.id && e.date <= today && e.source !== 'sim');
  const series = milkSeries(a.id, events, today, 14);
  const maxMilk = Math.max(1, ...series.map((x) => x.value));
  const fin = a.purpose === 'sut' ? financeFor(a, events, drugs, farm, today) : null;

  const onPhoto = async (f: File | undefined) => {
    if (f) st.setPhoto(a.id, await fileToThumb(f));
  };

  return (
    <Screen title={a.name}>
      <Card>
        <div className="row" style={{ gap: 14 }}>
          <button onClick={() => fileRef.current?.click()} style={{ border: 0, background: 'none', padding: 0, position: 'relative' }} aria-label="Fotoğraf çek">
            <Avatar animal={a} size={96} />
            <span style={{ position: 'absolute', right: -2, bottom: -2, background: '#fff', borderRadius: 16, padding: 4, fontSize: 16 }}>📷</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          <div className="grow col" style={{ gap: 2 }}>
            <span className="big">{a.name}</span>
            <span className="muted">🏷️ {a.ear_tag}</span>
            <span className="muted">{a.breed} · {a.sex === 'disi' ? 'Dişi' : 'Erkek'} · {ageText(a.birth_date, today)}</span>
          </div>
        </div>
        {w && w.milkDaysLeft > 0 && <Tag level="red" label={`🚫 Süt satılamaz: ${w.milkDaysLeft} gün`} />}
        {w && w.meatDaysLeft > 0 && <Tag level="yellow" label={`🥩 Kesime gidemez: ${w.meatDaysLeft} gün`} />}
        {calving && <Tag level="green" label={`🤰 Gebe · doğum ${fmtDate(calving)}`} />}
        {w && (w.milkDaysLeft > 0 || w.meatDaysLeft > 0) && (
          <span className="small muted">İlaç: {w.drugName}{w.milkUntil ? ` · süt ${fmtDate(w.milkUntil)} tarihinden itibaren satılabilir` : ''}</span>
        )}
      </Card>

      <div className="row" style={{ gap: 12 }}>
        <Btn icon="➕" label="Olay ekle" onClick={() => go(`/hayvan/${a.id}/olay`)} style={{ flex: 1 }} />
        <Btn icon="💬" label="Veterinere gönder" onClick={() => openWhatsApp(farm.vet_phone, animalSummary(a, farm, events, reminders, drugs, today))} color="var(--wa)" style={{ flex: 1.3 }} />
      </div>

      <QrCard animal={a} initiallyOpen={showQr} />

      {upcoming.length > 0 && (
        <Section title="⏰ Yaklaşan hatırlatmalar">
          {upcoming.map((r) => {
            const lv = reminderLevel(r, today);
            return (
              <Card key={r.id} level={lv} style={{ padding: '12px 16px' }}>
                <div className="row">
                  <span style={{ fontSize: 24 }}>{REMINDER_META[r.type].icon}</span>
                  <div className="grow">
                    <div className="bold">{st.drug(r.drug_id)?.name ?? REMINDER_META[r.type].label}</div>
                    <div className="small muted">{fmtDate(r.due_date)}{r.note ? ` · ${r.note}` : ''}</div>
                  </div>
                  <span className="bold" style={{ color: FG[lv] }}>{relDay(today, r.due_date)}</span>
                  {r.type !== 'withdrawal_end' && <Btn icon="✓" label="Yapıldı" onClick={() => st.completeReminder(r.id)} style={{ minHeight: 44, padding: '0 12px' }} />}
                </div>
              </Card>
            );
          })}
        </Section>
      )}

      {a.purpose === 'sut' && (
        <Section title="🥛 Süt verimi (14 gün)">
          <Card>
            <div className="bars">
              {series.map((p) => {
                const blocked = milkBlockedOn(a.id, p.date, events, drugs);
                const isToday = p.date === today;
                return (
                  <div key={p.date} title={`${fmtShort(p.date)}: ${p.value} lt`}>
                    {isToday && p.value > 0 && <span style={{ background: 'none' }}>{p.value}</span>}
                    <span style={{ height: `${Math.max(2, (p.value / maxMilk) * 85)}%`, background: isToday ? 'var(--primary)' : blocked ? '#ef9a9a' : '#a5d6a7' }} />
                  </div>
                );
              })}
            </div>
            <div className="row between xs muted">
              <span>{fmtShort(series[0].date)}</span>
              <span>🟥 satılamayan süt</span>
              <span>Bugün</span>
            </div>
          </Card>
        </Section>
      )}

      {fin && (
        <Section title="💰 Kâr / Zarar (son 30 gün)">
          <Card>
            <Line label={`Süt geliri (${fin.soldLiters} lt × ${farm.milk_price} ₺)`} value={fin.income} />
            {fin.blockedLiters > 0 && <Line label={`Satılamayan süt (${fin.blockedLiters} lt)`} value={0} note="arınma" />}
            <Line label="Yem gideri" value={-fin.feed} />
            <Line label="Tedavi / aşı gideri" value={-fin.health} />
            <div className="hr" />
            <div className="row between">
              <span className="bold" style={{ fontSize: 21 }}>{fin.net >= 0 ? '📈 Kâr' : '📉 Zarar'}</span>
              <span className={`big ${fin.net >= 0 ? 'c-green' : 'c-red'}`}>{money(fin.net)}</span>
            </div>
          </Card>
        </Section>
      )}

      <Section title="📜 Geçmiş">
        {history.length === 0 && <span className="muted">Kayıt yok</span>}
        {history.slice(0, 15).map((e) => {
          const m = EVENT_META[e.type];
          const drug = st.drug(e.drug_id);
          return (
            <Card key={e.id} style={{ padding: '12px 16px', background: m.color }}>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <span style={{ fontSize: 26 }}>{m.icon}</span>
                <div className="grow col" style={{ gap: 2 }}>
                  <span className="bold">
                    {m.label}
                    {e.value != null ? `: ${e.value} ${e.unit ?? ''}` : ''}
                    {drug ? ` — ${drug.name}` : ''}
                  </span>
                  <span className="small muted">
                    {fmtDate(e.date)}{e.source === 'voice' ? ' · 🎤 sesle' : ''}{e.cost ? ` · ${money(e.cost)}` : ''}
                  </span>
                  {e.note && e.source !== 'voice' ? <span className="small muted">{e.note}</span> : null}
                  <span><SourceBadge e={e} /></span>
                </div>
              </div>
            </Card>
          );
        })}
      </Section>

      <ShareSettingsCard animal={a} />
      <Disclaimer />
    </Screen>
  );
}

function Line({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className="row between">
      <span className="grow muted">{label}</span>
      <span className={`bold ${note || value < 0 ? 'c-red' : 'c-green'}`}>{note ? `(${note})` : money(value)}</span>
    </div>
  );
}
