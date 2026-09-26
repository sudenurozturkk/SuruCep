import { addDays, realToday } from '../lib/date';
import { CYCLE_REMINDERS, newAnimalPlan, nextRoutine, remindersForEvent } from '../logic/rules';
import { REPRO } from './knowledge';
import { DRUGS } from './catalog';
import {
  DEFAULT_SHARE,
  type Animal, type Drug, type Farm, type FarmEvent, type NewAnimal, type NewEvent,
  type Reminder, type ReminderType, type Role, type ScanLog, type ShareSettings,
} from './types';

// Tarayıcıda yerel veritabanı: SRS'teki tablolar birebir, tek JSON olarak localStorage'da.
// İnternet gerekmez (NFR-05/12). Buluta senkron (Supabase) yol haritasında.

export interface Tables {
  farm: Farm;
  animal: Animal[];
  event: FarmEvent[];
  reminder: Reminder[];
  drug: Drug[];
  scan_log: ScanLog[];
  setting: Record<string, string>;
  seq: number;
}

// Her kullanıcının çiftliği ayrı saklanır
let KEY = 'surucep.db.v4';
let t: Tables;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(t));
  } catch {
    /* depolama dolu/kapalı — bellekte devam */
  }
}

const nextId = () => ++t.seq;

export interface Owner { name: string; phone: string; village: string }

/** Giriş yapan kullanıcının veritabanını açar; yoksa demo ya da boş çiftlik kurar. */
export function initDb(userId: string, init?: { owner: Owner; demo: boolean }, fallbackOwner?: Owner) {
  KEY = `surucep.db.v4.${userId}`;
  if (init) {
    if (init.demo) seedDemo(init.owner);
    else seedEmpty(init.owner);
    return;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      t = JSON.parse(raw);
      return;
    }
  } catch {
    /* bozuk veri — yeniden kur */
  }
  seedDemo(fallbackOwner);
}

export function snapshot() {
  return {
    farm: t.farm,
    animals: t.animal.filter((a) => a.status === 'aktif'),
    events: [...t.event].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    reminders: [...t.reminder].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    drugs: t.drug,
  };
}

export const getSetting = (k: string): string | null => t.setting[k] ?? null;
export function setSetting(k: string, v: string) {
  t.setting[k] = v;
  persist();
}

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Olayı kaydeder ve kurallardan hatırlatmaları üretir. */
export function insertEvent(ev: NewEvent, save = true): { eventId: number; reminders: Reminder[] } {
  if (ev.type === 'insemination' || ev.type === 'birth') {
    for (const r of t.reminder) if (r.animal_id === ev.animal_id && !r.done && CYCLE_REMINDERS.includes(r.type)) r.done = 1;
  }
  // Aşı elle girilse de bekleyen aynı aşı hatırlatması kapanır
  if (ev.type === 'vaccine') {
    for (const r of t.reminder) if (r.animal_id === ev.animal_id && !r.done && r.type === 'vaccine' && (!r.drug_id || r.drug_id === ev.drug_id)) r.done = 1;
  }
  const e: FarmEvent = { verified_by: null, verified_at: null, ...ev, id: nextId() };
  t.event.push(e);
  const drug = ev.drug_id ? t.drug.find((d) => d.id === ev.drug_id) : undefined;
  const animal = t.animal.find((a) => a.id === ev.animal_id);
  const ctx = {
    species: animal?.species ?? 'sigir',
    birthDate: animal?.birth_date ?? null,
    prevDoses: t.event.filter((x) => x.id !== e.id && x.animal_id === ev.animal_id && x.type === 'vaccine' && x.drug_id === ev.drug_id && x.date < ev.date).map((x) => x.date),
    vaccineByName: (n: string) => t.drug.find((d) => d.name === n),
  } as const;
  const created: Reminder[] = remindersForEvent(ev, drug, ctx).map((d) => ({
    id: nextId(), animal_id: ev.animal_id, event_id: e.id, type: d.type, due_date: d.due_date, done: 0, notified: 0,
    drug_id: d.drug_id ?? null, note: d.note ?? null, postponed: 0,
  }));
  t.reminder.push(...created);
  if (save) persist();
  return { eventId: e.id, reminders: created };
}

/** Elle hatırlatma (veteriner kontrolü, tedavi takibi, planlı aşı) */
export function insertReminder(r: { animal_id: number; type: ReminderType; due_date: string; drug_id?: number | null; note?: string | null }, save = true): Reminder {
  const rem: Reminder = { id: nextId(), event_id: null, done: 0, notified: 0, postponed: 0, drug_id: null, note: null, ...r };
  t.reminder.push(rem);
  if (save) persist();
  return rem;
}

const DONE_NOTE: Partial<Record<ReminderType, string>> = {
  heat_check: 'Kızgınlık kontrolü yapıldı',
  pregnancy_check: 'Gebelik kontrolü yapıldı',
  dry_off: 'Kuruya çıkarıldı',
  vet_check: 'Veteriner kontrolü yapıldı',
  treatment_followup: 'Tedavi takibi yapıldı',
  deworming: 'Parazit uygulaması yapıldı',
  hoof_care: 'Tırnak bakımı yapıldı',
  calf_care: 'Yavru bakımı yapıldı',
};

/** FR-26: "Yapıldı" → iş kapanır ve ilgili olay kaydı otomatik oluşur (aşıda sonraki aşı hatırlatması da) */
export function completeReminder(id: number, today: string, vetName?: string): { event: FarmEvent | null; next: Reminder[] } {
  const r = t.reminder.find((x) => x.id === id);
  if (!r) return { event: null, next: [] };
  r.done = 1;
  if (r.type === 'withdrawal_end') {
    persist();
    return { event: null, next: [] };
  }
  const drug = r.drug_id ? t.drug.find((d) => d.id === r.drug_id) : undefined;
  const base = { animal_id: r.animal_id, date: today, value: null, unit: null, cost: null, source: 'manual' as const };
  const ev: NewEvent =
    r.type === 'vaccine'
      ? { ...base, type: 'vaccine', drug_id: r.drug_id, cost: drug?.price || null, note: null }
      : r.type === 'birth'
        ? { ...base, type: 'birth', drug_id: null, note: 'Doğum (takvimden)' }
        : { ...base, type: 'check', drug_id: null, note: [DONE_NOTE[r.type], r.note].filter(Boolean).join(' — ') };
  if (r.type === 'vet_check' && vetName) Object.assign(ev, { verified_by: vetName, verified_at: today });
  const { eventId, reminders } = insertEvent(ev, false);
  const animal = t.animal.find((a) => a.id === r.animal_id);
  // Rutin işler (parazit, tırnak) tamamlanınca bir sonraki kendiliğinden planlanır
  const nr = animal ? nextRoutine(r.type, animal.species, today) : null;
  if (nr) reminders.push(insertReminder({ animal_id: r.animal_id, ...nr }, false));
  // Kuruya çıkarılan inekte doğumdan ~6 hafta önce buzağı ishali aşısı (dry-off = doğum - 60 gün)
  if (r.type === 'dry_off' && animal) {
    const rp = REPRO[animal.species];
    const v = t.drug.find((d) => d.pregnant_only && d.species.split(',').includes(animal.species));
    if (v && rp.dryOffBeforeBirth) {
      reminders.push(insertReminder({ animal_id: animal.id, type: 'vaccine', due_date: addDays(today, rp.dryOffBeforeBirth - rp.prebirthVaccineBefore), drug_id: v.id, note: 'Doğumdan ~6 hafta önce (1. doz)' }, false));
    }
  }
  persist();
  return { event: t.event.find((e) => e.id === eventId) ?? null, next: reminders };
}

/** FR-27: işi 1/3/7 gün ertele (gecikmiş iş bugünden itibaren ertelenir), sayısı tutulur */
export function postponeReminder(id: number, days: number, today: string) {
  const r = t.reminder.find((x) => x.id === id);
  if (!r) return;
  r.due_date = addDays(r.due_date < today ? today : r.due_date, days);
  r.postponed = (r.postponed ?? 0) + 1;
  r.notified = 0;
  persist();
}

/** Yeni hayvan için yaşına, türüne ve cinsiyetine uygun aşı planı */
export function planNewAnimal(a: Animal, today: string): Reminder[] {
  const created = newAnimalPlan(a, today, t.drug).map((d) => insertReminder({ animal_id: a.id, ...d }, false));
  persist();
  return created;
}

/** FR-13: hayvan eklenince benzersiz QR token otomatik oluşur */
export function insertAnimal(a: NewAnimal, save = true): Animal {
  const animal: Animal = { ...a, id: nextId(), farm_id: 1, status: 'aktif', qr_token: uuid(), share_settings: { ...DEFAULT_SHARE } };
  t.animal.push(animal);
  if (save) persist();
  return animal;
}

export function updateAnimal(id: number, patch: Partial<Pick<Animal, 'photo_url' | 'share_settings'>>) {
  const a = t.animal.find((x) => x.id === id);
  if (a) Object.assign(a, patch);
  persist();
}

export function setShare(id: number, s: ShareSettings) {
  updateAnimal(id, { share_settings: s });
}

export function findByToken(token: string): Animal | undefined {
  return t.animal.find((a) => a.qr_token === token && a.status === 'aktif');
}

/** FR-22: küpe no (tamamı ya da son haneleri) veya isimle arama */
export function findByTagOrName(q: string): Animal | undefined {
  const s = q.trim().toLocaleUpperCase('tr-TR').replace(/\s/g, '');
  if (!s) return undefined;
  const active = t.animal.filter((a) => a.status === 'aktif');
  return (
    active.find((a) => a.ear_tag === s) ??
    active.find((a) => s.length >= 3 && /\d/.test(s) && a.ear_tag.endsWith(s)) ??
    active.find((a) => a.name.toLocaleUpperCase('tr-TR') === s)
  );
}

export function logScan(animal_id: number, role: Role) {
  t.scan_log.push({ id: nextId(), animal_id, role, scanned_at: new Date().toISOString() });
  persist();
}

export function setReminderDone(id: number, done: boolean) {
  const r = t.reminder.find((x) => x.id === id);
  if (r) r.done = done ? 1 : 0;
  persist();
}

export function markNotified(ids: number[]) {
  for (const r of t.reminder) if (ids.includes(r.id)) r.notified = 1;
  persist();
}

export function updateFarm(f: Partial<Farm>) {
  Object.assign(t.farm, f);
  persist();
}

/** "Zamanı ileri al": aradaki günler için rutin süt ve yem kayıtlarını simüle eder. */
export function simulateDays(fromExclusive: string, toInclusive: string, dailyMilk: Map<number, number>, animals: Animal[], save = true) {
  let d = addDays(fromExclusive, 1);
  let i = 1;
  while (d <= toInclusive) {
    for (const a of animals) {
      const y = dailyMilk.get(a.id);
      if (y && y > 0) {
        const v = Math.round((y + (((a.id * 7 + i * 3) % 5) - 2) * 0.5) * 10) / 10;
        t.event.push({ id: nextId(), animal_id: a.id, type: 'milk', date: d, value: v, unit: 'lt', drug_id: null, cost: null, note: null, source: 'sim', verified_by: null, verified_at: null });
      }
      if (i % 7 === 0) {
        t.event.push({ id: nextId(), animal_id: a.id, type: 'feed', date: d, value: null, unit: null, drug_id: null, cost: a.purpose === 'sut' ? 1260 : 1400, note: 'Haftalık yem', source: 'sim', verified_by: null, verified_at: null });
      }
    }
    d = addDays(d, 1);
    i++;
  }
  if (save) persist();
}

export function resetDemo() {
  seedDemo({ name: t.farm.owner_name, phone: t.farm.phone, village: t.farm.village });
}

function baseTables(owner?: Owner): Tables {
  return {
    farm: {
      id: 1,
      owner_name: owner?.name || 'Ahmet Yılmaz',
      phone: owner?.phone || '05320000000',
      village: owner?.village || 'Yeşilyurt Köyü',
      vet_name: 'Vet. Hek. Elif Kaya', vet_phone: '05550000000', milk_price: 20,
    },
    animal: [], event: [], reminder: [], drug: [], scan_log: [], setting: { day_offset: '0' }, seq: 0,
  };
}

/** Boş çiftlik: yalnızca ilaç/aşı kataloğu */
function seedEmpty(owner: Owner) {
  t = baseTables(owner);
  t.drug = DRUGS.map((x) => ({ ...x, id: nextId() }));
  persist();
}

// ---------- örnek çiftlik: "Ahmet Amca'nın 8 ineği" ----------
function seedDemo(owner?: Owner) {
  const T = realToday();
  const d = (n: number) => addDays(T, n);
  t = baseTables(owner);
  t.drug = DRUGS.map((x) => ({ ...x, id: nextId() }));
  const drugId = (name: string) => t.drug.find((x) => x.name === name)!.id;

  // [küpe, isim, cins, cinsiyet, amaç, doğum, günlük süt]
  const herd: [string, string, string, 'disi' | 'erkek', 'sut' | 'besi', string, number][] = [
    ['TR340012345601', 'Sarıkız', 'Holstein', 'disi', 'sut', '2021-03-14', 28],
    ['TR340012345602', 'Karakız', 'Simental', 'disi', 'sut', '2020-05-02', 18],
    ['TR340012345603', 'Pamuk', 'Holstein', 'disi', 'sut', '2019-04-20', 8],
    ['TR340012345604', 'Nazlı', 'Holstein', 'disi', 'sut', '2020-02-11', 24],
    ['TR340012345605', 'Maviş', 'Jersey', 'disi', 'sut', '2022-01-09', 16],
    ['TR340012345606', 'Cici', 'Montofon', 'disi', 'sut', '2021-07-30', 20],
    ['TR340012345607', 'Duman', 'Simental', 'erkek', 'besi', '2025-01-18', 0],
    ['TR340012345608', 'Boncuk', 'Yerli Kara', 'disi', 'besi', d(-85), 0],
  ];
  const ids: Record<string, number> = {};
  const yields = new Map<number, number>();
  const animals: Animal[] = [];
  for (const [tag, name, breed, sex, purpose, birth, y] of herd) {
    const a = insertAnimal({ ear_tag: tag, name, species: 'sigir', breed, sex, purpose, birth_date: birth, photo_url: null }, false);
    ids[name] = a.id;
    yields.set(a.id, y);
    animals.push(a);
  }

  const vet = t.farm.vet_name;
  const ev = (name: string, e: Partial<NewEvent> & Pick<NewEvent, 'type' | 'date'>, byVet = false) =>
    insertEvent({
      animal_id: ids[name], value: null, unit: null, drug_id: null, cost: null, note: null, source: 'manual',
      verified_by: byVet ? vet : null, verified_at: byVet ? e.date : null, ...e,
    }, false);

  // Son 30 günün rutin süt/yem kayıtları (bugün hariç — bugünü besici sesle girecek)
  simulateDays(d(-30), d(-1), yields, animals, false);

  // Kronolojik sırayla (doğum, sonraki tohumlamadan önce girilmeli).
  // Ek 2: dört takvim kartının hepsi dolu görünecek şekilde bugüne göre göreli tarihler.
  ev('Nazlı', { type: 'insemination', date: d(-265), note: 'Suni tohumlama' }, true); // doğum +18 (Yaklaşan)
  ev('Cici', { type: 'insemination', date: d(-258), note: 'Suni tohumlama' }, true); // doğum +25 (Yaklaşan)
  ev('Duman', { type: 'vaccine', date: d(-183), drug_id: drugId('Şap aşısı') }, true); // aşı 3 gün GECİKTİ (Dikkat)
  ev('Maviş', { type: 'vaccine', date: d(-178), drug_id: drugId('Şap aşısı') }, true); // +2 (Bu hafta)
  ev('Cici', { type: 'vaccine', date: d(-175), drug_id: drugId('Enterotoksemi aşısı') }); // +5 (Bu hafta)
  ev('Sarıkız', { type: 'vaccine', date: d(-90), drug_id: drugId('Şap aşısı') }, true);
  ev('Pamuk', { type: 'vaccine', date: d(-90), drug_id: drugId('Şap aşısı') }, true);
  ev('Karakız', { type: 'birth', date: d(-85), note: 'Dişi buzağı: Boncuk' });
  ev('Duman', { type: 'treatment', date: d(-60), drug_id: drugId('İvermektin (Parazit)'), cost: 300, note: 'Parazit uygulaması' });
  ev('Sarıkız', { type: 'insemination', date: d(-35), note: 'Suni tohumlama' }, true); // gebelik kontrolü BUGÜN
  ev('Karakız', { type: 'insemination', date: d(-21), note: 'Suni tohumlama' }, true); // kızgınlık kontrolü BUGÜN
  ev('Pamuk', { type: 'treatment', date: d(-12), drug_id: drugId('Vitamin AD3E'), cost: 200, note: 'İştahsızlık' });
  ev('Maviş', { type: 'insemination', date: d(-12), note: 'Suni tohumlama' }); // kızgınlık kontrolü +9 (Yaklaşan)
  ev('Pamuk', { type: 'treatment', date: d(-3), drug_id: drugId('Meme içi tüp (Mastitis)'), cost: 450, note: 'Sağ arka meme' }, true); // tedavi sürüyor (Dikkat)

  // Geçmişte kalan hatırlatmaları kapat — Duman'ın aşısı hariç (gecikmiş iş örneği)
  const dumanVaccine = t.reminder.find((r) => r.animal_id === ids['Duman'] && r.type === 'vaccine');
  for (const r of t.reminder) if (r.due_date < T && r !== dumanVaccine) r.done = 1;

  // Elle eklenmiş planlı işler
  insertReminder({ animal_id: ids['Boncuk'], type: 'vaccine', due_date: d(6), drug_id: drugId('Enterotoksemi aşısı'), note: 'Buzağı ilk aşı' }, false); // Bu hafta
  insertReminder({ animal_id: ids['Pamuk'], type: 'vet_check', due_date: d(3), note: 'Mastitis kontrolü' }, false); // Bu hafta
  // Rutin sağlık takipleri
  insertReminder({ animal_id: ids['Boncuk'], type: 'deworming', due_date: d(12), note: 'İlk parazit uygulaması (buzağı)' }, false);
  insertReminder({ animal_id: ids['Sarıkız'], type: 'hoof_care', due_date: d(40), note: 'Rutin tırnak bakımı' }, false);
  insertReminder({ animal_id: ids['Pamuk'], type: 'hoof_care', due_date: d(55), note: 'Rutin tırnak bakımı' }, false);
  for (const n of ['Sarıkız', 'Karakız', 'Pamuk', 'Nazlı', 'Maviş', 'Cici']) {
    insertReminder({ animal_id: ids[n], type: 'deworming', due_date: d(35 + (ids[n] % 5) * 7), note: 'Rutin parazit uygulaması (eprinomektin: sütte arınma yok)' }, false);
  }

  t.setting.day_offset = '0';
  t.setting.seed_date = T;
  persist();
}
