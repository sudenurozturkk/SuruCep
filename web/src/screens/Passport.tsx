import { useEffect } from 'react';
import { EVENT_META, REMINDER_META, SPECIES_META } from '../data/catalog';
import * as DB from '../data/db';
import type { Animal, Role } from '../data/types';
import { ageText, diffDays, fmtDate, relDay } from '../lib/date';
import { pregnancyInfo, reminderLevel, withdrawalFor, type Withdrawal } from '../logic/animal';
import { useStore } from '../store';
import { Avatar, BG, Btn, Card, Disclaimer, FG, Screen, Section, SourceBadge, Tag } from '../ui/kit';
import { RoleSwitch } from '../ui/RoleSwitch';

/** QR okutulunca açılan ekran — aynı QR, okutanın rolüne göre farklı işlem sunar */
export default function Passport({ id, role }: { id: number; role: Role }) {
  const st = useStore();
  const a = st.animal(id);
  if (!a) return <Screen title="Bulunamadı"><span>Hayvan bulunamadı.</span></Screen>;
  const w = withdrawalFor(a.id, st.events, st.drugs, st.today);

  const switchRole = (r: Role) => {
    st.setRole(r);
    st.replace(`/pasaport/${id}/${r}`);
  };

  const titles: Record<Role, string> = { owner: 'Bugünkü işler', buyer: 'Sağlık karnesi', vet: 'Veteriner görünümü', coop: 'Süt durumu' };

  return (
    <Screen title={`${a.name} · ${titles[role]}`}>
      <div className="col" style={{ gap: 6 }}>
        <span className="xs muted">Demo: aynı QR, farklı rol</span>
        <RoleSwitch value={role} onChange={switchRole} />
      </div>
      {role === 'owner' && <OwnerView a={a} w={w} />}
      {role === 'buyer' && <BuyerView a={a} w={w} />}
      {role === 'vet' && <VetView a={a} w={w} />}
      {role === 'coop' && <CoopView a={a} w={w} />}
    </Screen>
  );
}

function WithdrawalLock({ w }: { w: Withdrawal | null }) {
  if (!w || w.milkDaysLeft <= 0) return null;
  return (
    <Card level="red" style={{ background: 'var(--red-bg)' }}>
      <span className="big c-red">🔒 Süt satılamaz: {w.milkDaysLeft} gün</span>
      <span className="small muted">{w.drugName} · {w.milkUntil && fmtDate(w.milkUntil)} tarihinden itibaren satılabilir</span>
    </Card>
  );
}

// FR-16: besici modu — bekleyen iş en üstte + hızlı kayıt
function OwnerView({ a, w }: { a: Animal; w: Withdrawal | null }) {
  const st = useStore();
  const tasks = st.reminders
    .filter((r) => r.animal_id === a.id && !r.done && r.type !== 'withdrawal_end' && diffDays(st.today, r.due_date) <= 7)
    .sort((x, y) => x.due_date.localeCompare(y.due_date));


  return (
    <>
      <Card>
        <div className="row">
          <Avatar animal={a} size={64} />
          <div className="grow">
            <div className="big">{a.name}</div>
            <div className="small muted">{a.ear_tag}</div>
          </div>
        </div>
      </Card>

      {tasks.length > 0 ? (
        tasks.map((r) => {
          const lv = reminderLevel(r, st.today);
          const m = REMINDER_META[r.type];
          return (
            <Card key={r.id} level={lv} style={{ background: BG[lv] }}>
              <span className="bold" style={{ fontSize: 22 }}>{m.icon} {r.due_date < st.today ? `${diffDays(r.due_date, st.today)} gün gecikti` : r.due_date === st.today ? 'Bugün' : relDay(st.today, r.due_date)}: {m.label.toLocaleLowerCase('tr-TR')}</span>
              <span className="small muted">{m.hint}</span>
              <Btn big icon="✓" label="Yapıldı, kaydet" onClick={() => st.completeReminder(r.id)} />
            </Card>
          );
        })
      ) : (
        <Card level="green"><span className="bold c-green" style={{ fontSize: 20 }}>🟢 Bekleyen iş yok</span></Card>
      )}

      <WithdrawalLock w={w} />

      <Section title="⚡ Hızlı kayıt">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Btn big icon="🥛" label="Süt" onClick={() => st.go(`/hayvan/${a.id}/olay?tur=milk`)} color="#1976D2" />
          <Btn big icon="💉" label="Aşı" onClick={() => st.go(`/hayvan/${a.id}/olay?tur=vaccine`)} color="#388E3C" />
          <Btn big icon="💊" label="Tedavi" onClick={() => st.go(`/hayvan/${a.id}/olay?tur=treatment`)} color="#C62828" />
          <Btn big icon="🎤" label="Sesli" onClick={() => st.go(`/ses?hayvan=${a.id}`)} color="#37474F" />
        </div>
      </Section>
      <Btn outline icon="📋" label="Hayvanın tüm kartı" onClick={() => st.go(`/hayvan/${a.id}`)} />
    </>
  );
}

// FR-17 + NFR-11: alıcı modu — yalnızca sağlık karnesi, sahibin kişisel bilgisi YOK
function BuyerView({ a, w }: { a: Animal; w: Withdrawal | null }) {
  const st = useStore();
  const s = a.share_settings;
  const mine = st.events.filter((e) => e.animal_id === a.id && e.date <= st.today);
  const vaccines = mine.filter((e) => e.type === 'vaccine');
  const treatments = mine.filter((e) => e.type === 'treatment');
  const drugName = (id: number | null) => st.drugs.find((d) => d.id === id);

  return (
    <>
      <Card>
        <div className="row">
          <Avatar animal={a} size={64} />
          <div className="grow col" style={{ gap: 2 }}>
            <span className="big">{a.name}</span>
            <span className="muted">{SPECIES_META[a.species].icon} {SPECIES_META[a.species].label}{s.breedAge ? ` · ${a.breed} · ${a.sex === 'disi' ? 'Dişi' : 'Erkek'} · ${ageText(a.birth_date, st.today)}` : ''}</span>
            {s.earTag && <span className="small muted">🏷️ {a.ear_tag}</span>}
          </div>
        </div>
      </Card>

      {w && w.milkDaysLeft > 0 ? (
        <Card level="red" style={{ background: 'var(--red-bg)' }}>
          <span className="big c-red">⚠️ Arınma süresinde: {w.milkDaysLeft} gün</span>
          <span className="small">Bu hayvanın sütü {w.milkUntil && fmtDate(w.milkUntil)} tarihine kadar satılamaz.</span>
          {w.meatDaysLeft > 0 && <span className="small">Et arınması: {w.meatDaysLeft} gün</span>}
        </Card>
      ) : w && w.meatDaysLeft > 0 ? (
        <Card level="yellow" style={{ background: 'var(--yellow-bg)' }}>
          <span className="bold c-yellow" style={{ fontSize: 20 }}>🥩 Et arınması: {w.meatDaysLeft} gün</span>
          <span className="small">Süt satışına uygun, kesim için beklemeli.</span>
        </Card>
      ) : (
        <Card level="green" style={{ background: 'var(--green-bg)' }}>
          <span className="bold c-green" style={{ fontSize: 20 }}>✅ İlaç arınma süresi yok</span>
        </Card>
      )}

      {s.vaccines && (
        <Section title="💉 Aşılar">
          {vaccines.length === 0 && <span className="muted">Kayıt yok</span>}
          {vaccines.map((e) => (
            <Card key={e.id} style={{ padding: '12px 16px' }}>
              <div className="row between">
                <span className="bold">{drugName(e.drug_id)?.name ?? 'Aşı'}</span>
                <SourceBadge e={e} />
              </div>
              <span className="small muted">{fmtDate(e.date)}</span>
            </Card>
          ))}
        </Section>
      )}

      {s.treatments && (
        <Section title="💊 Tedaviler">
          {treatments.length === 0 && <span className="muted">Kayıt yok</span>}
          {treatments.length > 0 && <span className="small muted">Son tedavi: <b>{fmtDate(treatments[0].date)}</b></span>}
          {treatments.slice(0, 5).map((e) => (
            <Card key={e.id} style={{ padding: '12px 16px' }}>
              <div className="row between">
                <span className="bold">{drugName(e.drug_id)?.category ?? 'Tedavi'}</span>
                <SourceBadge e={e} />
              </div>
              <span className="small muted">{fmtDate(e.date)}</span>
            </Card>
          ))}
        </Section>
      )}

      <div className="disclaimer" style={{ fontStyle: 'normal' }}>🔒 Sahibin adı, telefonu, adresi, kâr/zarar ve notları bu ekranda gösterilmez.</div>
      <Disclaimer />
    </>
  );
}

// FR-19: veteriner modu — tam geçmiş + onaylı kayıt girişi
function VetView({ a, w }: { a: Animal; w: Withdrawal | null }) {
  const st = useStore();
  const calving = pregnancyInfo(a.id, st.reminders);
  const history = st.events.filter((e) => e.animal_id === a.id && e.date <= st.today && e.type !== 'milk' && e.type !== 'feed');

  return (
    <>
      <Card style={{ background: 'var(--vet-bg)' }}>
        <div className="row">
          <Avatar animal={a} size={56} />
          <div className="grow">
            <div className="bold" style={{ fontSize: 22 }}>{a.name}</div>
            <div className="small muted">{a.ear_tag} · {a.breed} · {ageText(a.birth_date, st.today)}</div>
          </div>
        </div>
        {calving && <Tag level="green" label={`🤰 Gebe · doğum ${fmtDate(calving)}`} />}
      </Card>
      <WithdrawalLock w={w} />
      <div className="row" style={{ gap: 12 }}>
        <Btn icon="💊" label="Tedavi gir" color="var(--vet)" onClick={() => st.go(`/hayvan/${a.id}/olay?tur=treatment&vet=1`)} style={{ flex: 1 }} />
        <Btn icon="💉" label="Aşı gir" color="var(--vet)" outline onClick={() => st.go(`/hayvan/${a.id}/olay?tur=vaccine&vet=1`)} style={{ flex: 1 }} />
      </div>
      <Section title="📜 Tam sağlık geçmişi">
        {history.map((e) => {
          const m = EVENT_META[e.type];
          const d = st.drug(e.drug_id);
          return (
            <Card key={e.id} style={{ padding: '12px 16px', background: e.verified_by ? '#fbf6fd' : undefined, borderLeftColor: e.verified_by ? 'var(--vet)' : undefined }}>
              <div className="row between">
                <span className="bold">{m.icon} {m.label}{d ? ` — ${d.name}` : ''}</span>
              </div>
              <span className="small muted">{fmtDate(e.date)}{e.note ? ` · ${e.note}` : ''}{d && d.kind === 'drug' ? ` · süt ${d.milk_withdrawal_days} g / et ${d.meat_withdrawal_days} g` : ''}</span>
              <span><SourceBadge e={e} />{e.verified_by && <span className="xs muted"> {e.verified_by}</span>}</span>
            </Card>
          );
        })}
      </Section>
    </>
  );
}

// FR-20: kooperatif modu — tek büyük yeşil/kırmızı kart
function CoopView({ a, w }: { a: Animal; w: Withdrawal | null }) {
  const blocked = !!w && w.milkDaysLeft > 0;
  return (
    <>
      <div className={`status-card ${blocked ? 'no' : 'ok'}`}>
        <span style={{ fontSize: 90, lineHeight: 1 }}>{blocked ? '🚫' : '✅'}</span>
        <span style={{ fontSize: 34, fontWeight: 900 }}>{blocked ? 'SÜT SATILAMAZ' : 'SÜT SATILABİLİR'}</span>
        {blocked && <span style={{ fontSize: 26, fontWeight: 800 }}>{w!.milkDaysLeft} gün kaldı</span>}
      </div>
      <Card>
        <div className="row between">
          <span className="bold" style={{ fontSize: 20 }}>{a.name}</span>
          <code>{a.ear_tag}</code>
        </div>
        {blocked && <span className="small muted">Kabul tarihi: {w!.milkUntil && fmtDate(w!.milkUntil)}</span>}
      </Card>
      <span className="xs muted center" style={{ color: FG.green }}>Yalnızca süt satış durumu paylaşılır.</span>
    </>
  );
}

/** QR linki doğrudan açıldığında (#/a/{token}) token'ı yerel veritabanında çözer */
export function TokenResolver({ token }: { token: string }) {
  const st = useStore();
  const a = DB.findByToken(token.toLowerCase());
  useEffect(() => {
    if (a) {
      DB.logScan(a.id, st.role);
      st.replace(`/pasaport/${a.id}/${st.role}`);
    }
  }, [a, st]);
  if (a) return null;
  return (
    <Screen title="QR">
      <Card level="yellow">
        <span className="bold">Bu QR bu cihazda kayıtlı bir hayvana ait değil.</span>
        <span className="small muted">Bulut senkronu (yol haritası) ile diğer cihazlardan da açılabilecek.</span>
      </Card>
      <Btn label="Ana sayfa" onClick={() => st.replace('/')} />
    </Screen>
  );
}
