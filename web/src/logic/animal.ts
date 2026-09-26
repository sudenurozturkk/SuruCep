import type { Animal, Drug, Farm, FarmEvent, Reminder } from '../data/types';
import { addDays, diffDays } from '../lib/date';

export type Level = 'green' | 'yellow' | 'red';

export interface Withdrawal {
  milkUntil: string | null; // bu tarihten itibaren süt satılabilir
  meatUntil: string | null;
  milkDaysLeft: number;
  meatDaysLeft: number;
  drugName: string;
}

/** FR-07: Aktif ilaç arınma süreleri */
export function withdrawalFor(animalId: number, events: FarmEvent[], drugs: Drug[], today: string): Withdrawal | null {
  let best: Withdrawal | null = null;
  for (const e of events) {
    if (e.animal_id !== animalId || e.type !== 'treatment' || !e.drug_id || e.date > today) continue;
    const drug = drugs.find((d) => d.id === e.drug_id);
    if (!drug) continue;
    const milkUntil = addDays(e.date, drug.milk_withdrawal_days);
    const meatUntil = addDays(e.date, drug.meat_withdrawal_days);
    const milkLeft = Math.max(0, diffDays(today, milkUntil));
    const meatLeft = Math.max(0, diffDays(today, meatUntil));
    if (milkLeft === 0 && meatLeft === 0) continue;
    if (!best || milkLeft > best.milkDaysLeft || (milkLeft === best.milkDaysLeft && meatLeft > best.meatDaysLeft)) {
      best = { milkUntil, meatUntil, milkDaysLeft: milkLeft, meatDaysLeft: meatLeft, drugName: drug.name };
    }
  }
  return best;
}

/** Tarih için süt satış yasağı var mı (kâr/zarar hesabında satılamayan süt gelir sayılmaz) */
export function milkBlockedOn(animalId: number, date: string, events: FarmEvent[], drugs: Drug[]): boolean {
  return events.some((e) => {
    if (e.animal_id !== animalId || e.type !== 'treatment' || !e.drug_id) return false;
    const drug = drugs.find((d) => d.id === e.drug_id);
    return !!drug && drug.milk_withdrawal_days > 0 && date >= e.date && date < addDays(e.date, drug.milk_withdrawal_days);
  });
}

export function openReminders(animalId: number, reminders: Reminder[]) {
  return reminders.filter((r) => r.animal_id === animalId && !r.done);
}

/** NFR-02: yeşil sorun yok / sarı yaklaşıyor / kırmızı acil */
export function levelFor(animalId: number, reminders: Reminder[], w: Withdrawal | null, today: string): Level {
  if (w && w.milkDaysLeft > 0) return 'red';
  if (w && w.meatDaysLeft > 0 && openReminders(animalId, reminders).every((r) => r.due_date > today)) return 'yellow';
  const open = openReminders(animalId, reminders);
  if (open.some((r) => r.due_date <= today)) return 'red';
  if (open.some((r) => diffDays(today, r.due_date) <= 7)) return 'yellow';
  return 'green';
}

export function reminderLevel(r: Reminder, today: string): Level {
  const n = diffDays(today, r.due_date);
  return n <= 0 ? 'red' : n <= 7 ? 'yellow' : 'green';
}

export interface Finance {
  milkLiters: number;
  soldLiters: number;
  blockedLiters: number;
  income: number;
  feed: number;
  health: number;
  net: number;
}

/** FR-09: Son 30 gün kâr/zarar */
export function financeFor(a: Animal, events: FarmEvent[], drugs: Drug[], farm: Farm, today: string): Finance {
  const from = addDays(today, -29);
  let milk = 0, blocked = 0, feed = 0, health = 0;
  for (const e of events) {
    if (e.animal_id !== a.id || e.date < from || e.date > today) continue;
    if (e.type === 'milk') {
      const v = e.value ?? 0;
      milk += v;
      if (milkBlockedOn(a.id, e.date, events, drugs)) blocked += v;
    } else if (e.type === 'feed') feed += e.cost ?? 0;
    else if (e.type === 'treatment' || e.type === 'vaccine') health += e.cost ?? 0;
  }
  const sold = milk - blocked;
  const income = Math.round(sold * farm.milk_price);
  return {
    milkLiters: Math.round(milk),
    soldLiters: Math.round(sold),
    blockedLiters: Math.round(blocked),
    income,
    feed,
    health,
    net: income - feed - health,
  };
}

/** Son n günün günlük süt verimi (grafik için) */
export function milkSeries(animalId: number, events: FarmEvent[], today: string, n = 14) {
  const out: { date: string; value: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const value = events
      .filter((e) => e.animal_id === animalId && e.type === 'milk' && e.date === date)
      .reduce((s, e) => s + (e.value ?? 0), 0);
    out.push({ date, value });
  }
  return out;
}

/** Son 7 günün ortalama verimi (zaman simülasyonu için) */
export function avgMilk(animalId: number, events: FarmEvent[], today: string): number {
  const s = milkSeries(animalId, events, today, 7).filter((x) => x.value > 0);
  return s.length ? s.reduce((a, b) => a + b.value, 0) / s.length : 0;
}

export function pregnancyInfo(animalId: number, reminders: Reminder[]) {
  const calving = reminders.find((r) => r.animal_id === animalId && !r.done && r.type === 'birth');
  return calving ? calving.due_date : null;
}

export const money = (n: number) => `${n < 0 ? '−' : ''}${Math.abs(Math.round(n)).toLocaleString('tr-TR')} ₺`;
