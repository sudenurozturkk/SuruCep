import { REMINDER_META } from '../data/catalog';
import { relDay } from '../lib/date';
import { financeFor, levelFor, money, openReminders, withdrawalFor, type Level } from '../logic/animal';
import { useStore } from '../store';
import { Avatar, Btn, Card, Dot, FG, Screen, Tag } from '../ui/kit';

const RANK: Record<Level, number> = { red: 0, yellow: 1, green: 2 };

export default function Animals() {
  const { animals, events, reminders, drugs, farm, today, go } = useStore();

  // FR-02: yaklaşan olayı olan hayvanlar üstte
  const rows = animals
    .map((a) => {
      const w = withdrawalFor(a.id, events, drugs, today);
      const next = openReminders(a.id, reminders).sort((x, y) => x.due_date.localeCompare(y.due_date))[0];
      return { a, w, next, level: levelFor(a.id, reminders, w, today), fin: a.purpose === 'sut' ? financeFor(a, events, drugs, farm, today) : null };
    })
    .sort((x, y) => RANK[x.level] - RANK[y.level] || (x.next?.due_date ?? '9').localeCompare(y.next?.due_date ?? '9'));

  const total = rows.reduce((s, r) => s + (r.fin?.net ?? 0), 0);

  return (
    <Screen title="🐄 Hayvanlarım">
      <Card style={{ background: total >= 0 ? 'var(--green-bg)' : 'var(--red-bg)' }}>
        <span className="muted">Son 30 gün sağmal inek kâr/zararı</span>
        <span className={`huge ${total >= 0 ? 'c-green' : 'c-red'}`}>{total >= 0 ? '▲' : '▼'} {money(total)}</span>
      </Card>

      <div className="grid-cards">
      {rows.map(({ a, w, next, level, fin }) => (
        <Card key={a.id} level={level} onClick={() => go(`/hayvan/${a.id}`)}>
          <div className="row" style={{ gap: 12 }}>
            <Avatar animal={a} size={68} />
            <div className="grow col" style={{ gap: 2 }}>
              <div className="row" style={{ gap: 8 }}>
                <Dot level={level} />
                <span className="bold" style={{ fontSize: 22 }}>{a.name}</span>
              </div>
              <span className="small muted">{a.breed} · {a.ear_tag.slice(-6)}</span>
              {next && (
                <span className="bold" style={{ fontSize: 17, color: FG[level] }}>
                  {REMINDER_META[next.type].icon} {REMINDER_META[next.type].label} — {relDay(today, next.due_date)}
                </span>
              )}
            </div>
            {fin ? (
              <div className="col" style={{ alignItems: 'flex-end', gap: 0 }}>
                <span style={{ fontSize: 26 }}>{fin.net >= 0 ? '📈' : '📉'}</span>
                <span className={`bold ${fin.net >= 0 ? 'c-green' : 'c-red'}`}>{fin.net >= 0 ? 'Kâr' : 'Zarar'}</span>
                <span className={`xs ${fin.net >= 0 ? 'c-green' : 'c-red'}`}>{money(fin.net)}</span>
              </div>
            ) : (
              <span className="xs muted">Besi</span>
            )}
          </div>
          {w && w.milkDaysLeft > 0 && <Tag level="red" label={`🚫 Süt satılamaz: ${w.milkDaysLeft} gün`} />}
        </Card>
      ))}
      </div>

      <Btn icon="➕" label="Yeni hayvan ekle" onClick={() => go('/yeni-hayvan')} />
    </Screen>
  );
}
