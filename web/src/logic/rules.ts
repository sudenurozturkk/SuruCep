import { FOLLOWUP, REPRO, ROUTINES } from '../data/knowledge';
import type { Animal, Drug, FarmEvent, NewEvent, ReminderType, Species } from '../data/types';
import { addDays, diffDays } from '../lib/date';

export interface ReminderDraft {
  type: ReminderType;
  due_date: string;
  drug_id?: number | null;
  note?: string | null;
}

export interface RuleContext {
  species: Species;
  birthDate: string | null;
  /** Bu aşının hayvana daha önce yapılmış dozlarının tarihleri */
  prevDoses: string[];
  /** Gebe koyun/keçide doğum öncesi aşı için */
  vaccineByName: (name: string) => Drug | undefined;
}

/** Türe göre tohumlama sonrası hatırlatmalar (sığır: 21/35/223/283. gün) */
export function inseminationPlan(species: Species, date: string, ctx?: Pick<RuleContext, 'vaccineByName'>): ReminderDraft[] {
  const r = REPRO[species];
  const out: ReminderDraft[] = [
    { type: 'heat_check', due_date: addDays(date, r.cycleDays), note: `${r.cycleDays}. gün: kızgınlık tekrar görülürse gebe kalmamıştır` },
    { type: 'pregnancy_check', due_date: addDays(date, r.pregCheckDays), note: r.pregCheckMethod },
  ];
  if (r.dryOffBeforeBirth) {
    out.push({ type: 'dry_off', due_date: addDays(date, r.gestationDays - r.dryOffBeforeBirth), note: `Doğumdan ${r.dryOffBeforeBirth} gün önce` });
  }
  if (species !== 'sigir') {
    // Küçükbaş: doğumdan 4-6 hafta önce enterotoksemi (yavru ağız sütüyle korunur)
    const v = ctx?.vaccineByName('Enterotoksemi aşısı');
    out.push({ type: 'vaccine', due_date: addDays(date, r.gestationDays - r.prebirthVaccineBefore), drug_id: v?.id ?? null, note: 'Doğum öncesi aşı' });
  }
  out.push({ type: 'birth', due_date: addDays(date, r.gestationDays), note: `Ortalama ${r.gestationDays} gün (${r.gestationRange})` });
  return out;
}

/** Olay kaydedilince oluşacak hatırlatmalar (FR-05, FR-07). Hatırlatmalar elle girilmez, buradan türetilir. */
export function remindersForEvent(ev: NewEvent | FarmEvent, drug: Drug | undefined, ctx?: RuleContext): ReminderDraft[] {
  const species = ctx?.species ?? 'sigir';
  const r = REPRO[species];
  switch (ev.type) {
    case 'insemination':
      return inseminationPlan(species, ev.date, ctx);
    case 'birth': {
      const out: ReminderDraft[] = [
        { type: 'vet_check', due_date: addDays(ev.date, r.postpartumCheckDays), note: 'Doğum sonrası kontrol: rahim temizliği, son atılması, meme' },
      ];
      out.push(
        { type: 'calf_care', due_date: ev.date, note: 'İlk 2 saatte ağız sütü, göbeğe iyot, yavrunun emdiğini kontrol et' },
        { type: 'calf_care', due_date: addDays(ev.date, FOLLOWUP.weaningDays), note: 'Sütten kesme zamanı (günde 1 kg+ kaba yem/buzağı başlangıç yemi yiyorsa)' },
      );
      if (r.voluntaryWaitDays) {
        out.push({ type: 'heat_check', due_date: addDays(ev.date, r.voluntaryWaitDays), note: `Bekleme süresi doldu (${r.voluntaryWaitDays}. gün): ilk kızgınlıkta tohumlatın` });
      }
      return out;
    }
    case 'treatment': {
      // Besici için günlük kritik olan süt satışıdır; süt arınması yoksa et arınması hatırlatılır
      const days = drug?.milk_withdrawal_days || drug?.meat_withdrawal_days || 0;
      const out: ReminderDraft[] = days > 0 ? [{ type: 'withdrawal_end', due_date: addDays(ev.date, days) }] : [];
      // Antibiyotik / ateş-ağrı / serum sonrası sonuç kontrolü
      if (drug && ['Antibiyotik', 'Ağrı / Ateş', 'Serum'].includes(drug.category)) {
        out.push({ type: 'treatment_followup', due_date: addDays(ev.date, FOLLOWUP.treatmentDays), note: `${drug.name} sonrası: ateş, iştah, süt kontrolü` });
      }
      // Parazit ilacı → bir sonraki parazit uygulaması
      if (drug?.category === 'Parazit') {
        out.push({ type: 'deworming', due_date: addDays(ev.date, ROUTINES.deworming.days[species]), note: 'Rutin parazit uygulaması' });
      }
      return out;
    }
    case 'vaccine': {
      if (!drug) return [];
      const next = nextVaccineDays(drug, ev.date, ctx);
      return next ? [{ type: 'vaccine', due_date: addDays(ev.date, next.days), drug_id: drug.id, note: next.note }] : [];
    }
    default:
      return [];
  }
}

/** Birincil aşılama (genç hayvanda ilk doz → rapel) ya da düzenli tekrar */
function nextVaccineDays(drug: Drug, date: string, ctx?: RuleContext): { days: number; note: string } | null {
  const prev = ctx?.prevDoses ?? [];
  if (drug.pregnant_only) {
    const recent = prev.some((p) => Math.abs(diffDays(p, date)) < 60);
    return !recent && drug.booster_days ? { days: drug.booster_days, note: 'Rapel (2. doz)' } : null;
  }
  const ageAtDose = ctx?.birthDate ? diffDays(ctx.birthDate, date) : 9999;
  const primarySeries = prev.length === 0 && drug.booster_days > 0 && ageAtDose < drug.first_age_days + 120;
  if (primarySeries) return { days: drug.booster_days, note: 'Rapel (2. doz)' };
  return drug.repeat_days > 0 ? { days: drug.repeat_days, note: 'Tekrar aşı' } : null;
}

/** Rutin iş tamamlanınca bir sonrakinin tarihi */
export function nextRoutine(type: ReminderType, species: Species, done: string): ReminderDraft | null {
  if (type === 'deworming' || type === 'hoof_care') {
    return { type, due_date: addDays(done, ROUTINES[type].days[species]), note: 'Rutin takip' };
  }
  return null;
}

/**
 * Yeni eklenen hayvan için aşı planı.
 * Genç (<1 yaş): türe/cinsiyete uygun aşıların ilk dozları yaşına göre planlanır.
 * Yetişkin: geçmişi bilinmediği için tek bir "aşı karnesi kontrolü" oluşturulur.
 */
export function newAnimalPlan(a: Pick<Animal, 'species' | 'sex' | 'birth_date'>, today: string, drugs: Drug[]): ReminderDraft[] {
  const age = diffDays(a.birth_date, today);
  const routines: ReminderDraft[] = [
    { type: 'deworming', due_date: age < 60 ? addDays(a.birth_date, 75) : addDays(today, 14), note: age < 60 ? 'İlk parazit uygulaması (2-3 aylık)' : 'Parazit uygulaması (geçmiş bilinmiyor)' },
  ];
  if (age >= 365) routines.push({ type: 'hoof_care', due_date: addDays(today, 30), note: 'İlk tırnak kontrolü' });
  if (age >= 365) {
    return [{ type: 'vet_check', due_date: addDays(today, 7), note: 'Aşı karnesi kontrolü: geçmiş aşıları veterinerle doğrulayın' }, ...routines];
  }
  return [...routines, ...drugs
    .filter((d) => d.kind === 'vaccine' && !d.pregnant_only && d.species.split(',').includes(a.species) && (!d.female_only || a.sex === 'disi'))
    .map((d) => {
      const planned = addDays(a.birth_date, d.first_age_days);
      const late = planned < today;
      return {
        type: 'vaccine' as const,
        due_date: late ? addDays(today, 3) : planned,
        drug_id: d.id,
        note: late ? `İlk doz (${Math.round(d.first_age_days / 30)} aylıkken yapılmalıydı)` : `İlk doz: ${Math.round(d.first_age_days / 30)} aylık`,
      };
    })]
    .sort((x, y) => x.due_date.localeCompare(y.due_date));
}

/** Yeni tohumlama veya doğum girilince eski gebelik döngüsü hatırlatmaları kapanır. */
export const CYCLE_REMINDERS: ReminderType[] = ['heat_check', 'pregnancy_check', 'dry_off', 'birth'];
