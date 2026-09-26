import type { Animal, Drug, EventType } from '../data/types';
import { addDays } from '../lib/date';

// FR-04: Kural tabanlı Türkçe cümle ayrıştırıcı — tamamen çevrimdışı, LLM gerektirmez.
// "Sarıkız bugün 12 litre süt verdi" → { hayvan: Sarıkız, tür: süt, miktar: 12 lt }

export interface ParseResult {
  text: string;
  animalId: number | null;
  type: EventType | null;
  value: number | null;
  unit: string | null;
  cost: number | null;
  drugId: number | null;
  drugCandidates: number[];
  date: string;
  note: string;
}

/** Türkçe küçük harf + aksan katlama: "Sarıkız'ın" → "sarikizin" */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'`´]/g, '')
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/â/g, 'a').replace(/î/g, 'i')
    .replace(/[^a-z0-9,.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const UNITS: Record<string, number> = {
  bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9,
};
const TENS: Record<string, number> = {
  on: 10, yirmi: 20, otuz: 30, kirk: 40, elli: 50, altmis: 60, yetmis: 70, seksen: 80, doksan: 90,
};

interface NumTok { value: number; index: number; next: string }

/** Rakam veya yazıyla sayıları bulur: "12", "12,5", "on iki", "yirmi beş buçuk", "bin beş yüz" */
function findNumbers(tokens: string[]): NumTok[] {
  const out: NumTok[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const digit = t.match(/^\d+([.,]\d+)?$/);
    if (digit) {
      let v = parseFloat(t.replace(',', '.'));
      // "1.500" binlik ayırıcı
      if (/^\d{1,3}\.\d{3}$/.test(t)) v = parseFloat(t.replace('.', ''));
      let j = i + 1;
      if (tokens[j] === 'bucuk') { v += 0.5; j++; }
      out.push({ value: v, index: i, next: tokens[j] ?? '' });
      i = j;
      continue;
    }
    if (t in UNITS || t in TENS || t === 'yuz' || t === 'bin') {
      let total = 0, cur = 0, j = i;
      while (j < tokens.length) {
        const w = tokens[j];
        if (w in UNITS) cur += UNITS[w];
        else if (w in TENS) cur += TENS[w];
        else if (w === 'yuz') cur = (cur || 1) * 100;
        else if (w === 'bin') { total += (cur || 1) * 1000; cur = 0; }
        else if (w === 'bucuk') { cur += 0.5; j++; break; }
        else break;
        j++;
      }
      // "bir" tek başına genelde sayı değil ("bir tane", "bir iğne") — yine de değer olarak kabul et
      out.push({ value: total + cur, index: i, next: tokens[j] ?? '' });
      i = j;
      continue;
    }
    i++;
  }
  return out;
}

const RX = {
  birth: /(dogurdu|dogum|dogurdu|yavruladi|buzagiladi|kuzuladi)/,
  insemination: /(tohum|suni|boga ya|bogaya|asim yap|asildi|asimlandi)/,
  vaccine: /(\basi\b|\basisi|\basiladim|\basilandi|\basi yap|asisini|asilari)/,
  treatment: /(antibiyotik|ilac|igne|tedavi|serum|vitamin|agri kesici|tup|surdum|mastit|parazit)/,
  feed: /(\byem\b|yemi|saman|arpa|silaj|kesif|yonca)/,
  milk: /(\bsut\b|sutu|litre|\blt\b|sagdim|sagildi|verdi)/,
};

export function parseSentence(text: string, animals: Animal[], drugs: Drug[], today: string): ParseResult {
  const f = fold(text);
  const tokens = f.split(' ');
  const compact = f.replace(/\s/g, '');

  // Hayvan: isim (ek alabilir: "pamuka", "sarikizin") veya küpe numarasının son hanesi
  let animalId: number | null = null;
  let bestLen = 0;
  for (const a of animals) {
    const n = fold(a.name).replace(/\s/g, '');
    if (n.length > bestLen && (tokens.some((t) => t.startsWith(n)) || compact.includes(n))) {
      animalId = a.id;
      bestLen = n.length;
    }
  }
  if (!animalId) {
    const tag = f.match(/(\d{3,})\s*(numara|nolu|kupe)/);
    if (tag) animalId = animals.find((a) => a.ear_tag.endsWith(tag[1]))?.id ?? null;
  }

  // Olay türü (öncelik sırasıyla)
  let type: EventType | null = null;
  if (RX.birth.test(f)) type = 'birth';
  else if (RX.insemination.test(f)) type = 'insemination';
  else if (RX.vaccine.test(f)) type = 'vaccine';
  else if (RX.treatment.test(f)) type = 'treatment';
  else if (RX.feed.test(f)) type = 'feed';
  else if (RX.milk.test(f)) type = 'milk';

  // Sayılar: "lira/tl" ile biteni maliyet, diğeri miktar
  let value: number | null = null;
  let cost: number | null = null;
  for (const n of findNumbers(tokens)) {
    if (/^(lira|tl|liraya|liralik)/.test(n.next)) cost = n.value;
    else if (value === null) value = n.value;
  }
  if (type === null && value !== null && /(litre|lt)/.test(f)) type = 'milk';

  let unit: string | null = null;
  if (type === 'milk') unit = 'lt';
  if (type === 'feed') unit = /(kilo|kg)/.test(f) ? 'kg' : null;
  if (type !== 'milk' && type !== 'feed') value = null;

  // İlaç / aşı eşleştirme
  let drugId: number | null = null;
  let drugCandidates: number[] = [];
  if (type === 'treatment' || type === 'vaccine') {
    const kind = type === 'vaccine' ? 'vaccine' : 'drug';
    const pool = drugs.filter((d) => d.kind === kind);
    const specific = pool.filter((d) =>
      [d.name, ...d.aliases.split(',')].some((al) => {
        const k = fold(al);
        return k.length > 2 && k !== 'antibiyotik' && f.includes(k);
      }),
    );
    if (specific.length === 1) drugId = specific[0].id;
    else if (specific.length > 1) drugCandidates = specific.map((d) => d.id);
    else if (/antibiyotik/.test(f)) drugCandidates = pool.filter((d) => d.category === 'Antibiyotik').map((d) => d.id);
    else drugCandidates = pool.map((d) => d.id);
  }

  let date = today;
  if (/(evvelsi gun|onceki gun|iki gun once)/.test(f)) date = addDays(today, -2);
  else if (/\bdun\b/.test(f)) date = addDays(today, -1);

  return { text, animalId, type, value, unit, cost, drugId, drugCandidates, date, note: text };
}

export const DEMO_SENTENCES = [
  'Sarıkız bugün 12 litre süt verdi',
  "Pamuk'a antibiyotik yaptım",
  'Karakız tohumlandı',
  "Maviş'e şap aşısı yaptım",
  'Nazlı dün 20 litre verdi',
];
