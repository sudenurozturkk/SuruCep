// Demo kabul kriteri: 5 demo cümlesinden en az 4'ü doğru ayrışmalı. Çalıştır: npx tsx scripts/check-parser.ts
import { DRUGS } from '../src/data/catalog';
import type { Animal, Drug } from '../src/data/types';
import { remindersForEvent } from '../src/logic/rules';
import { parseSentence } from '../src/logic/parser';

const names = ['Sarıkız', 'Karakız', 'Pamuk', 'Nazlı', 'Maviş', 'Cici', 'Duman', 'Boncuk'];
const animals = names.map((name, i) => ({ id: i + 1, name, ear_tag: `TR34001234560${i + 1}` }) as Animal);
const drugs = DRUGS.map((d, i) => ({ ...d, id: i + 1 }) as Drug);
const T = '2026-09-26';

const cases: [string, string, string, number | null][] = [
  ['Sarıkız bugün 12 litre süt verdi', 'Sarıkız', 'milk', 12],
  ["Pamuk'a antibiyotik yaptım", 'Pamuk', 'treatment', null],
  ['Karakız tohumlandı', 'Karakız', 'insemination', null],
  ["Maviş'e şap aşısı yaptım", 'Maviş', 'vaccine', null],
  ['Nazlı dün 20 litre verdi', 'Nazlı', 'milk', 20],
  ['sarı kız on iki buçuk litre süt verdi', 'Sarıkız', 'milk', 12.5],
  ['Karakız doğurdu', 'Karakız', 'birth', null],
  ['Duman için 500 liralık yem aldım', 'Duman', 'feed', null],
  ["Cici'ye oksitetrasiklin iğnesi yaptım", 'Cici', 'treatment', null],
];
let ok = 0;
for (const [s, an, ty, val] of cases) {
  const r = parseSentence(s, animals, drugs, T);
  const a = animals.find((x) => x.id === r.animalId)?.name;
  const pass = a === an && r.type === ty && (val === null || r.value === val);
  ok += pass ? 1 : 0;
  const dr = r.drugId ? drugs.find((d) => d.id === r.drugId)!.name : r.drugCandidates.length ? `${r.drugCandidates.length} aday` : '';
  console.log(pass ? 'OK  ' : 'FAIL', JSON.stringify(s), '→', a, r.type, r.value ?? '', r.cost ? `${r.cost}TL` : '', dr, r.date);
}
console.log(`${ok}/${cases.length}`);
console.log('Tohumlama:', remindersForEvent({ type: 'insemination', date: T } as any, undefined));
console.log('Antibiyotik:', remindersForEvent({ type: 'treatment', date: T } as any, drugs[0]));
