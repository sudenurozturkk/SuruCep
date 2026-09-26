import { DISCLAIMER, EVENT_META } from '../data/catalog';
import type { Animal, Drug, Farm, FarmEvent, Reminder } from '../data/types';
import { ageText, fmtDate } from '../lib/date';
import { pregnancyInfo, withdrawalFor } from './animal';

/** 05321234567 → 905321234567 */
export function intlPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.startsWith('90')) return d;
  if (d.startsWith('0')) return '9' + d;
  return '90' + d;
}

/** FR-08: Veterinere gidecek hayvan özeti — son 3 tedavi ve son 3 aşı */
export function animalSummary(a: Animal, farm: Farm, events: FarmEvent[], reminders: Reminder[], drugs: Drug[], today: string): string {
  const mine = events.filter((e) => e.animal_id === a.id && e.date <= today);
  const drugName = (e: FarmEvent) => drugs.find((d) => d.id === e.drug_id)?.name ?? e.note ?? '';
  const badge = (e: FarmEvent) => (e.verified_by ? ' [Veteriner onaylı]' : '');
  const treatments = mine.filter((e) => e.type === 'treatment').slice(0, 3);
  const vaccines = mine.filter((e) => e.type === 'vaccine').slice(0, 3);
  const w = withdrawalFor(a.id, events, drugs, today);
  const calving = pregnancyInfo(a.id, reminders);
  const lastMilk = mine.filter((e) => e.type === 'milk').slice(0, 3).map((e) => e.value).join(', ');

  const lines = [
    `Merhaba ${farm.vet_name}, ben ${farm.owner_name} (${farm.village}).`,
    ``,
    `*${a.name}* hakkında bilgi paylaşıyorum:`,
    `• Küpe no: ${a.ear_tag}`,
    `• ${a.breed}, ${a.sex === 'disi' ? 'dişi' : 'erkek'}, ${ageText(a.birth_date, today)}`,
    lastMilk ? `• Son süt verimi (lt): ${lastMilk}` : '',
    calving ? `• Gebe — tahmini doğum: ${fmtDate(calving)}` : '',
    w && w.milkDaysLeft > 0 ? `• ⚠️ Arınma süresinde (${w.drugName}): süt ${w.milkDaysLeft} gün daha satılamaz` : '',
    ``,
    `${EVENT_META.treatment.icon} *Son tedaviler:*`,
    ...(treatments.length ? treatments.map((e) => `- ${fmtDate(e.date)}: ${drugName(e)}${e.note && e.drug_id ? ` (${e.note})` : ''}${badge(e)}`) : ['- Kayıt yok']),
    ``,
    `${EVENT_META.vaccine.icon} *Son aşılar:*`,
    ...(vaccines.length ? vaccines.map((e) => `- ${fmtDate(e.date)}: ${drugName(e)}${badge(e)}`) : ['- Kayıt yok']),
    ``,
    `_SürüCep ile gönderildi. ${DISCLAIMER}_`,
  ];
  return lines.filter((l, i, arr) => l !== '' || arr[i - 1] !== '').join('\n');
}

export function openWhatsApp(phone: string, text: string) {
  window.open(`https://wa.me/${intlPhone(phone)}?text=${encodeURIComponent(text)}`, '_blank');
}

export function callPhone(phone: string) {
  window.location.href = `tel:${phone.replace(/\s/g, '')}`;
}
