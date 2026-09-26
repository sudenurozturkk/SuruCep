import { useState } from 'react';
import { REMINDER_META } from '../data/catalog';
import { addDays, fmtShort, relDay } from '../lib/date';
import { financeFor, money } from '../logic/animal';
import { BUCKETS, GROUP_LABEL, buildCalendar, summaryText, type Bucket, type CalItem } from '../logic/calendar';
import { useStore } from '../store';
import { Avatar, Btn } from '../ui/kit';

// Panel: istatistikler + Sürü Sağlık Takvimi (Ek 2) + süt ve kâr/zarar özetleri
export default function Home() {
  const st = useStore();
  const { today, reminders, animals, events, drugs, farm, go } = st;
  const [open, setOpen] = useState<Bucket | null>(null);

  const cal = buildCalendar(animals, reminders, events, drugs, today);
  const visible = BUCKETS.filter((b) => cal[b.key].length > 0); // FR-28
  const withdrawn = cal.attention.filter((i) => i.kind === 'treatment').length;
  const dairy = animals.filter((a) => a.purpose === 'sut');
  const fin = dairy.map((a) => ({ a, f: financeFor(a, events, drugs, farm, today) })).sort((x, y) => y.f.net - x.f.net);
  const net = fin.reduce((s, x) => s + x.f.net, 0);

  // Sürü toplam süt (14 gün)
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const milk = days.map((d) => ({ d, v: events.filter((e) => e.type === 'milk' && e.date === d).reduce((s, e) => s + (e.value ?? 0), 0) }));
  const maxMilk = Math.max(1, ...milk.map((m) => m.v));
  const avgMilk = Math.round(milk.slice(0, 13).reduce((s, m) => s + m.v, 0) / 13);

  const firstName = farm.owner_name.split(' ')[0];

  return (
    <div className="dash">
      <div className="dash-hello">
        <div>
          <h1 className="huge" style={{ margin: 0 }}>Merhaba {firstName} 👋</h1>
          <span className="muted">
            {cal.attention.length + cal.today.length > 0
              ? `Bugün ${cal.today.length} işiniz ve ${cal.attention.length} dikkat gerektiren durumunuz var.`
              : 'Bugün her şey yolunda.'}
          </span>
        </div>
      </div>

      <div className="stat-grid">
        <Stat icon="🐄" label="Toplam hayvan" value={String(animals.length)} sub={`${dairy.length} sağmal`} onClick={() => go('/hayvanlar')} />
        <Stat icon="📌" label="Bugünkü iş" value={String(cal.today.length)} sub="yapılacak" tone="green" onClick={() => setOpen('today')} />
        <Stat icon="⚠️" label="Dikkat" value={String(cal.attention.length)} sub="gecikmiş / tedavide" tone="red" onClick={() => setOpen('attention')} />
        <Stat icon="🚫" label="Arınmada" value={String(withdrawn)} sub="sütü/eti satılamaz" tone={withdrawn ? 'red' : undefined} />
        <Stat icon="💰" label="Son 30 gün" value={money(net)} sub={net >= 0 ? 'net kâr' : 'net zarar'} tone={net >= 0 ? 'green' : 'red'} />
      </div>

      <div className="dash-grid">
        <section className="col" style={{ gap: 12 }}>
          <h2 className="h2">🗓️ Sürü Sağlık Takvimi</h2>
          {visible.length === 0 && (
            <div className="cal-card tone-green cal-empty">
              <span className="big">🟢 Bugün her şey yolunda</span>
              <span className="muted">Önümüzdeki 30 günde bekleyen iş yok.</span>
              {animals.length === 0 && <Btn icon="➕" label="İlk hayvanınızı ekleyin" onClick={() => go('/yeni-hayvan')} />}
            </div>
          )}
          {visible.map((b) => {
            const items = cal[b.key];
            const isOpen = open === b.key;
            return (
              <div key={b.key} className={`cal-card tone-${b.tone}`}>
                <button className="cal-head" onClick={() => setOpen(isOpen ? null : b.key)} aria-expanded={isOpen}>
                  <span className="cal-icon" aria-hidden>{b.icon}</span>
                  <span className="grow col" style={{ gap: 2 }}>
                    <span className="cal-title">{b.title}</span>
                    <span className="cal-sum">{summaryText(b.key, items)}</span>
                  </span>
                  <span className="cal-num">{items.length}</span>
                  <span className="cal-chev">{isOpen ? '▲' : '▼'}</span>
                </button>
                {isOpen && (
                  <div className="cal-list">
                    <BulkBar items={items} />
                    {items.map((it) => <CalRow key={it.kind === 'reminder' ? `r${it.r.id}` : `t${it.animal.id}`} it={it} />)}
                  </div>
                )}
              </div>
            );
          })}
        </section>

        <section className="col" style={{ gap: 16 }}>
          <div className="panel">
            <div className="row between">
              <h3 className="panel-title">🥛 Sürü süt üretimi</h3>
              <span className="small muted">ort. {avgMilk} lt/gün</span>
            </div>
            <div className="bars" style={{ height: 150 }}>
              {milk.map((m) => (
                <div key={m.d} title={`${fmtShort(m.d)}: ${Math.round(m.v)} lt`}>
                  {m.d === today && m.v > 0 && <span style={{ background: 'none' }}>{Math.round(m.v)}</span>}
                  <span style={{ height: `${Math.max(2, (m.v / maxMilk) * 85)}%`, background: m.d === today ? 'var(--primary)' : '#a5d6a7' }} />
                </div>
              ))}
            </div>
            <div className="row between xs muted"><span>{fmtShort(days[0])}</span><span>Bugün</span></div>
          </div>

          <div className="panel">
            <div className="row between">
              <h3 className="panel-title">💰 Hayvan başına kâr / zarar</h3>
              <span className="small muted">son 30 gün</span>
            </div>
            {fin.length === 0 && <span className="muted small">Sağmal hayvan yok.</span>}
            {fin.map(({ a, f }) => (
              <button key={a.id} className="fin-row" onClick={() => go(`/hayvan/${a.id}`)}>
                <Avatar animal={a} size={34} />
                <span className="grow bold">{a.name}</span>
                <span className={`bold ${f.net >= 0 ? 'c-green' : 'c-red'}`}>{f.net >= 0 ? '▲' : '▼'} {money(f.net)}</span>
              </button>
            ))}
          </div>

          <div className="panel">
            <h3 className="panel-title">⚡ Hızlı işlemler</h3>
            <div className="quick-grid">
              <button onClick={() => go('/ses')}><span>🎤</span>Sesli kayıt</button>
              <button onClick={() => go('/qr')}><span>📷</span>QR okut</button>
              <button onClick={() => go('/yeni-hayvan')}><span>➕</span>Hayvan ekle</button>
              <button onClick={() => go('/veteriner')}><span>🩺</span>Veteriner</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub, tone, onClick }: { icon: string; label: string; value: string; sub: string; tone?: 'green' | 'red'; onClick?: () => void }) {
  return (
    <button className={`stat ${tone ? 'stat-' + tone : ''}`} onClick={onClick} disabled={!onClick}>
      <span className="stat-ic">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-val">{value}</span>
      <span className="xs muted">{sub}</span>
    </button>
  );
}

/** Tek tık: aynı türdeki işleri (ör. aşı kampanyası günü tüm sürü) birden tamamla */
function BulkBar({ items }: { items: CalItem[] }) {
  const st = useStore();
  const groups = new Map<string, number[]>();
  for (const it of items) {
    if (it.kind !== 'reminder') continue;
    const k = it.r.type;
    groups.set(k, [...(groups.get(k) ?? []), it.r.id]);
  }
  const multi = [...groups.entries()].filter(([, ids]) => ids.length > 1);
  const all = items.filter((i) => i.kind === 'reminder').map((i) => (i as Extract<CalItem, { kind: 'reminder' }>).r.id);
  if (all.length < 2) return null;
  return (
    <div className="bulk-bar">
      <span className="small bold muted">⚡ Tek tıkla:</span>
      {multi.map(([type, ids]) => (
        <button key={type} className="bulk-btn" onClick={() => st.completeMany(ids)}>
          ✓ {ids.length} {GROUP_LABEL[type as keyof typeof GROUP_LABEL]} yapıldı
        </button>
      ))}
      <button className="bulk-btn all" onClick={() => { if (confirm(`${all.length} işin hepsi yapıldı olarak işaretlensin mi?`)) st.completeMany(all); }}>
        ✓ Tümü yapıldı ({all.length})
      </button>
    </div>
  );
}

/** FR-25/26/27: satırda fotoğraf, ad, iş, tarih + Yapıldı / Ertele */
function CalRow({ it }: { it: CalItem }) {
  const st = useStore();
  const [postpone, setPostpone] = useState(false);

  if (it.kind === 'treatment') {
    const { animal: a, w } = it;
    return (
      <div className="cal-row">
        <button className="cal-row-main" onClick={() => st.go(`/hayvan/${a.id}`)}>
          <Avatar animal={a} size={48} />
          <span className="grow col" style={{ gap: 2 }}>
            <span className="bold" style={{ fontSize: 18 }}>💊 {a.name}: tedavisi sürüyor</span>
            <span className="small c-red bold">
              {w.milkDaysLeft > 0 ? `Süt ${w.milkDaysLeft} gün` : ''}{w.milkDaysLeft > 0 && w.meatDaysLeft > 0 ? ' · ' : ''}{w.meatDaysLeft > 0 ? `et ${w.meatDaysLeft} gün` : ''} satılamaz
            </span>
            <span className="xs muted">{w.drugName}</span>
          </span>
          <span className="muted" style={{ fontSize: 26 }}>›</span>
        </button>
      </div>
    );
  }

  const { r, animal: a, overdueDays } = it;
  const m = REMINDER_META[r.type];
  const drug = st.drug(r.drug_id);
  const when = overdueDays > 0 ? `${overdueDays} gün gecikti` : r.due_date === st.today ? 'Bugün' : `${relDay(st.today, r.due_date)} · ${fmtShort(r.due_date)}`;

  return (
    <div className="cal-row">
      <div className="row wrap" style={{ gap: 10 }}>
        <button className="cal-row-main grow" style={{ minWidth: 220 }} onClick={() => st.go(`/hayvan/${a.id}`)}>
          <Avatar animal={a} size={48} />
          <span className="grow col" style={{ gap: 2 }}>
            <span className="bold" style={{ fontSize: 18 }}>{m.icon} {a.name}: {m.label}</span>
            {(drug || r.note) && <span className="small muted">{[drug?.name, r.note].filter(Boolean).join(' · ')}</span>}
            <span className="row-hint">💡 {m.hint}</span>
            <span className={`small bold ${overdueDays > 0 ? 'c-red' : ''}`}>{when}{r.postponed ? ` · ${r.postponed}× ertelendi` : ''}</span>
          </span>
        </button>
        {!postpone ? (
          <div className="row" style={{ gap: 8 }}>
            <Btn icon="✓" label="Yapıldı" onClick={() => st.completeReminder(r.id)} style={{ minHeight: 48 }} />
            <Btn outline icon="⏭️" label="Ertele" color="var(--muted)" onClick={() => setPostpone(true)} style={{ minHeight: 48, padding: '0 12px' }} />
          </div>
        ) : (
          <div className="row" style={{ gap: 6 }}>
            {[1, 3, 7].map((d) => (
              <Btn key={d} outline label={`+${d} gün`} color="var(--yellow)" onClick={() => { setPostpone(false); st.postponeReminder(r.id, d); }} style={{ minHeight: 48, padding: '0 12px' }} />
            ))}
            <button className="icon-btn" onClick={() => setPostpone(false)} aria-label="Vazgeç">✕</button>
          </div>
        )}
      </div>
    </div>
  );
}
