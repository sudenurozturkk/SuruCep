// Tarihler her yerde 'YYYY-MM-DD' metni olarak tutulur; hesaplar UTC ile yapılır (saat dilimi kayması olmaz).

const DAY = 86_400_000;

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function realToday(): string {
  const now = new Date();
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(iso: string, days: number): string {
  return toISO(new Date(Date.parse(iso + 'T00:00:00Z') + days * DAY));
}

/** b - a (gün) */
export function diffDays(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / DAY);
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function fmtDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)}`;
}

export function fmtLong(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${WEEKDAYS[d.getUTCDay()]}`;
}

/** "Bugün", "Yarın", "3 gün sonra", "2 gün geçti" */
export function relDay(today: string, iso: string): string {
  const n = diffDays(today, iso);
  if (n === 0) return 'Bugün';
  if (n === 1) return 'Yarın';
  if (n === -1) return 'Dün';
  if (n > 1) return `${n} gün sonra`;
  return `${-n} gün geçti`;
}

export function ageText(birth: string, today: string): string {
  const days = diffDays(birth, today);
  if (days < 60) return `${days} günlük`;
  const months = Math.floor(days / 30.44);
  if (months < 24) return `${months} aylık`;
  return `${Math.floor(months / 12)} yaşında`;
}
