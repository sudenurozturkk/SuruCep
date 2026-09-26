import type { Animal, Drug, FarmEvent, Reminder, ReminderType } from '../data/types';
import { diffDays } from '../lib/date';
import { withdrawalFor, type Withdrawal } from './animal';

// Ek 2 — Sürü Sağlık Takvimi. Her iş yalnızca TEK bir kartta sayılır.
export type Bucket = 'attention' | 'today' | 'week' | 'upcoming';

export const BUCKETS: { key: Bucket; title: string; icon: string; tone: 'red' | 'green' | 'yellow' | 'blue'; rule: string }[] = [
  { key: 'attention', title: 'Dikkat', icon: '⚠️', tone: 'red', rule: 'Gecikmiş işler ve tedavisi süren hayvanlar' },
  { key: 'today', title: 'Bugün', icon: '📌', tone: 'green', rule: 'Bugün yapılacaklar' },
  { key: 'week', title: 'Bu hafta', icon: '📅', tone: 'yellow', rule: 'Önümüzdeki 7 gün' },
  { key: 'upcoming', title: 'Yaklaşan', icon: '🔭', tone: 'blue', rule: '8-30 gün içinde' },
];

/** FR-24: iş türü → sade Türkçe grup adı */
export const GROUP_LABEL: Record<Exclude<ReminderType, 'withdrawal_end'>, string> = {
  vaccine: 'aşı',
  vet_check: 'veteriner kontrolü',
  birth: 'doğum',
  heat_check: 'tohumlama takibi',
  pregnancy_check: 'gebelik kontrolü',
  dry_off: 'kuruya çıkarma',
  treatment_followup: 'tedavi takibi',
  deworming: 'parazit uygulaması',
  hoof_care: 'tırnak bakımı',
  calf_care: 'yavru bakımı',
};
const GROUP_ORDER = Object.keys(GROUP_LABEL);

export type CalItem =
  | { kind: 'reminder'; r: Reminder; animal: Animal; overdueDays: number }
  | { kind: 'treatment'; animal: Animal; w: Withdrawal };

export function bucketOf(r: Reminder, today: string): Bucket | null {
  const n = diffDays(today, r.due_date);
  if (n < 0) return 'attention';
  if (n === 0) return 'today';
  if (n <= 7) return 'week';
  if (n <= 30) return 'upcoming';
  return null;
}

export function buildCalendar(animals: Animal[], reminders: Reminder[], events: FarmEvent[], drugs: Drug[], today: string) {
  const out: Record<Bucket, CalItem[]> = { attention: [], today: [], week: [], upcoming: [] };
  const byId = new Map(animals.map((a) => [a.id, a]));

  // Arınma bitiş hatırlatmaları ayrı iş sayılmaz: hayvan "tedavisi sürüyor" olarak Dikkat'te görünür
  for (const r of reminders) {
    if (r.done || r.type === 'withdrawal_end') continue;
    const animal = byId.get(r.animal_id);
    if (!animal) continue;
    const b = bucketOf(r, today);
    if (b) out[b].push({ kind: 'reminder', r, animal, overdueDays: Math.max(0, diffDays(r.due_date, today)) });
  }
  for (const b of Object.keys(out) as Bucket[]) {
    out[b].sort((x, y) => (x.kind === 'reminder' && y.kind === 'reminder' ? x.r.due_date.localeCompare(y.r.due_date) : 0));
  }
  for (const animal of animals) {
    const w = withdrawalFor(animal.id, events, drugs, today);
    if (w && (w.milkDaysLeft > 0 || w.meatDaysLeft > 0)) out.attention.push({ kind: 'treatment', animal, w });
  }
  return out;
}

/** "1 gecikmiş aşı · 1 hayvanın tedavisi sürüyor" */
export function summaryText(bucket: Bucket, items: CalItem[]): string {
  const counts = new Map<string, number>();
  let treat = 0;
  for (const it of items) {
    if (it.kind === 'treatment') { treat++; continue; }
    const t = it.r.type as keyof typeof GROUP_LABEL;
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const parts = [...counts.entries()]
    .sort((a, b) => GROUP_ORDER.indexOf(a[0]) - GROUP_ORDER.indexOf(b[0]))
    .map(([t, n]) => `${n} ${bucket === 'attention' ? 'gecikmiş ' : ''}${GROUP_LABEL[t as keyof typeof GROUP_LABEL]}`);
  if (treat) parts.push(`${treat} hayvanın tedavisi sürüyor`);
  return parts.join(' · ');
}
