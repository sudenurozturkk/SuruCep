import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { EVENT_META, REMINDER_META } from './data/catalog';
import * as DB from './data/db';
import type { Animal, Drug, Farm, FarmEvent, NewAnimal, NewEvent, Reminder, ReminderType, Role, ShareSettings } from './data/types';
import { addDays, fmtDate, realToday } from './lib/date';
import { notifyNow } from './lib/notify';
import { avgMilk } from './logic/animal';

// ---------- hash tabanlı yönlendirme (tarayıcı geri tuşu çalışır, QR linki doğrudan açılır) ----------
export type Route =
  | { name: 'home' }
  | { name: 'animals' }
  | { name: 'animal'; id: number; showQr?: boolean }
  | { name: 'addEvent'; animalId: number; type?: string; vet?: boolean }
  | { name: 'addAnimal' }
  | { name: 'voice'; animalId?: number }
  | { name: 'vet' }
  | { name: 'supports' }
  | { name: 'guide' }
  | { name: 'scan' }
  | { name: 'token'; token: string }
  | { name: 'passport'; id: number; role: Role };

export function parseHash(hash: string): Route {
  const [path, qs = ''] = hash.replace(/^#/, '').split('?');
  const q = new URLSearchParams(qs);
  const p = path.split('/').filter(Boolean);
  const n = (s: string | undefined) => parseInt(s ?? '', 10);
  switch (p[0]) {
    case 'hayvanlar': return { name: 'animals' };
    case 'hayvan':
      if (p[2] === 'olay') return { name: 'addEvent', animalId: n(p[1]), type: q.get('tur') ?? undefined, vet: q.get('vet') === '1' };
      return { name: 'animal', id: n(p[1]), showQr: q.get('qr') === '1' };
    case 'yeni-hayvan': return { name: 'addAnimal' };
    case 'ses': return { name: 'voice', animalId: q.get('hayvan') ? n(q.get('hayvan')!) : undefined };
    case 'veteriner': return { name: 'vet' };
    case 'destekler': return { name: 'supports' };
    case 'rehber': return { name: 'guide' };
    case 'qr': return { name: 'scan' };
    case 'a': return { name: 'token', token: p[1] ?? '' };
    case 'pasaport': return { name: 'passport', id: n(p[1]), role: (p[2] as Role) || 'owner' };
    default: return { name: 'home' };
  }
}

export interface Banner {
  icon: string;
  title: string;
  body: string;
  tone: 'green' | 'yellow' | 'red';
}

type Data = ReturnType<typeof DB.snapshot>;

interface Store extends Data {
  today: string;
  dayOffset: number;
  consent: boolean;
  route: Route;
  role: Role;
  banner: Banner | null;
  go: (path: string) => void;
  replace: (path: string) => void;
  back: () => void;
  setRole: (r: Role) => void;
  showBanner: (b: Banner) => void;
  hideBanner: () => void;
  addEvent: (e: NewEvent) => Reminder[];
  addAnimal: (a: NewAnimal) => { animal: Animal; plan: Reminder[] };
  setPhoto: (id: number, uri: string) => void;
  setShare: (id: number, s: ShareSettings) => void;
  toggleReminder: (id: number, done: boolean) => void;
  completeReminder: (id: number) => void;
  completeMany: (ids: number[]) => void;
  postponeReminder: (id: number, days: number) => void;
  addReminder: (r: { animal_id: number; type: ReminderType; due_date: string; note?: string | null }) => void;
  advanceDays: (n: number) => Promise<void>;
  resetDemo: () => void;
  acceptConsent: () => void;
  updateFarm: (f: Partial<Farm>) => void;
  animal: (id: number) => Animal | undefined;
  drug: (id: number | null) => Drug | undefined;
}

const Ctx = createContext<Store>(null as unknown as Store);
// eslint-disable-next-line react-refresh/only-export-components
export const useStore = () => useContext(Ctx);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => DB.snapshot());
  const [dayOffset, setDayOffset] = useState(() => parseInt(DB.getSetting('day_offset') ?? '0', 10) || 0);
  const [consent, setConsent] = useState(() => DB.getSetting('kvkk') === '1');
  const [role, setRoleState] = useState<Role>(() => (DB.getSetting('role') as Role) || 'owner');
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const today = addDays(realToday(), dayOffset);
  const reload = useCallback(() => setData(DB.snapshot()), []);

  const store: Store = useMemo(() => {
    const events: FarmEvent[] = data.events;
    return {
      ...data,
      today,
      dayOffset,
      consent,
      route,
      role,
      banner,
      go: (path) => { window.location.hash = path; },
      replace: (path) => { window.location.replace('#' + path); },
      back: () => {
        if (window.history.length > 1 && route.name !== 'home') window.history.back();
        else window.location.hash = '/';
      },
      setRole: (r) => {
        DB.setSetting('role', r);
        setRoleState(r);
      },
      showBanner: setBanner,
      hideBanner: () => setBanner(null),
      addEvent: (e) => {
        const { reminders } = DB.insertEvent(e);
        reload();
        return reminders;
      },
      addAnimal: (a) => {
        const created = DB.insertAnimal(a);
        const plan = DB.planNewAnimal(created, today);
        reload();
        return { animal: created, plan };
      },
      setPhoto: (id, uri) => {
        DB.updateAnimal(id, { photo_url: uri });
        reload();
      },
      setShare: (id, s) => {
        DB.setShare(id, s);
        reload();
      },
      toggleReminder: (id, done) => {
        DB.setReminderDone(id, done);
        reload();
      },
      completeReminder: (id) => {
        const r = data.reminders.find((x) => x.id === id);
        if (!r) return;
        const { event, next } = DB.completeReminder(id, today, data.farm.vet_name);
        reload();
        const a = data.animals.find((x) => x.id === r.animal_id);
        const lines = [event ? `📝 Olay kaydedildi: ${EVENT_META[event.type].label}` : 'İş kapatıldı.'];
        for (const n of next) lines.push(`${REMINDER_META[n.type].icon} Sonraki: ${REMINDER_META[n.type].label} — ${fmtDate(n.due_date)}`);
        setBanner({ icon: '✅', title: `${a?.name}: ${REMINDER_META[r.type].label} yapıldı`, body: lines.join('\n'), tone: 'green' });
      },
      completeMany: (ids) => {
        let events = 0;
        for (const id of ids) if (DB.completeReminder(id, today, data.farm.vet_name).event) events++;
        reload();
        setBanner({ icon: '✅', title: `${ids.length} iş tek seferde tamamlandı`, body: `${events} olay kaydı oluşturuldu, sonraki tarihler takvime eklendi.`, tone: 'green' });
      },
      postponeReminder: (id, days) => {
        DB.postponeReminder(id, days, today);
        reload();
        setBanner({ icon: '⏭️', title: `${days} gün ertelendi`, body: 'İş takvimde yeni tarihine taşındı.', tone: 'yellow' });
      },
      addReminder: (r) => {
        DB.insertReminder(r);
        reload();
      },
      advanceDays: async (n) => {
        const from = today;
        const to = addDays(today, n);
        const yields = new Map(data.animals.map((a) => [a.id, avgMilk(a.id, events, from)]));
        DB.simulateDays(from, to, yields, data.animals);
        const newOffset = dayOffset + n;
        DB.setSetting('day_offset', String(newOffset));
        setDayOffset(newOffset);

        // Bugün vadesi gelenler önce
        const due = data.reminders
          .filter((r) => !r.done && !r.notified && r.due_date <= to)
          .sort((a, b) => b.due_date.localeCompare(a.due_date));
        const lines = due.map((r) => {
          const a = data.animals.find((x) => x.id === r.animal_id);
          return `${REMINDER_META[r.type].icon} ${a?.name ?? ''}: ${REMINDER_META[r.type].label}`;
        });
        DB.markNotified(due.map((r) => r.id));
        reload();
        if (due.length) {
          for (const l of lines.slice(0, 5)) await notifyNow('SürüCep hatırlatma', l);
          setBanner({ icon: '🔔', title: `${due.length} hatırlatma zamanı geldi`, body: lines.join('\n'), tone: 'yellow' });
        } else {
          setBanner({ icon: '⏩', title: `${n} gün ileri alındı`, body: 'Yeni hatırlatma yok.', tone: 'green' });
        }
      },
      resetDemo: () => {
        DB.resetDemo();
        setDayOffset(0);
        reload();
        window.location.hash = '/';
        setBanner({ icon: '🔄', title: 'Demo sıfırlandı', body: 'Örnek çiftlik yeniden yüklendi.', tone: 'green' });
      },
      acceptConsent: () => {
        DB.setSetting('kvkk', '1');
        setConsent(true);
      },
      updateFarm: (f) => {
        DB.updateFarm(f);
        reload();
      },
      animal: (id) => data.animals.find((a) => a.id === id),
      drug: (id) => (id ? data.drugs.find((d) => d.id === id) : undefined),
    };
  }, [data, today, dayOffset, consent, route, role, banner, reload]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}
