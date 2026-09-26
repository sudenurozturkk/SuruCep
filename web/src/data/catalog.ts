import { MEDICINES, VACCINES } from './knowledge';
import type { Drug, EventType, ReminderType } from './types';

// İlaç ve aşı kataloğu bilgi tabanından (knowledge.ts) üretilir.
export const DRUGS: Omit<Drug, 'id'>[] = [
  ...MEDICINES.map((m) => ({
    name: m.name, kind: 'drug' as const, category: m.category, aliases: m.aliases,
    milk_withdrawal_days: m.milk, meat_withdrawal_days: m.meat, repeat_days: 0, price: m.price,
    note: m.note ?? null, species: 'sigir,koyun,keci', first_age_days: 0, booster_days: 0, female_only: 0, pregnant_only: 0, schedule: null,
  })),
  ...VACCINES.map((v) => ({
    name: v.name, kind: 'vaccine' as const, category: 'Aşı', aliases: v.aliases,
    milk_withdrawal_days: 0, meat_withdrawal_days: 0, repeat_days: v.repeatDays, price: v.price,
    note: v.note ?? null, species: v.species.join(','), first_age_days: v.firstAgeDays, booster_days: v.boosterDays,
    female_only: v.femaleOnly ? 1 : 0, pregnant_only: v.pregnantOnly ? 1 : 0, schedule: v.schedule,
  })),
];

export const REMINDER_META: Record<ReminderType, { label: string; icon: string; hint: string }> = {
  heat_check: { label: 'Kızgınlık kontrolü', icon: '🔥', hint: 'Binilince durma, berrak ipliksi akıntı, böğürme, süt düşüşü var mı bakın. Sabah görülürse akşam, akşam görülürse ertesi sabah tohumlatın.' },
  pregnancy_check: { label: 'Gebelik kontrolü', icon: '🩺', hint: 'Veteriner ultrasonla (28-35. gün) ya da elle (40-60. gün) gebeliği doğrular.' },
  dry_off: { label: 'Kuruya çıkarma', icon: '🌙', hint: 'Doğumdan ~60 gün önce sağımı kesin, kuru dönem tüpünü veterinerle planlayın, yemi kuru dönem rasyonuna geçirin.' },
  birth: { label: 'Tahmini doğum', icon: '🐮', hint: 'Doğumdan 2-3 hafta önce temiz doğum bölmesine alın. Yavruya ilk 2 saatte ağız sütü verin, göbeğini iyotlayın.' },
  withdrawal_end: { label: 'Arınma süresi bitiyor', icon: '✅', hint: 'İlaç bekleme süresi doldu; süt/et yeniden satılabilir.' },
  vaccine: { label: 'Aşı zamanı', icon: '💉', hint: 'Aşı takvimine göre zamanı geldi. Hasta, ateşli hayvanı aşılamayın.' },
  vet_check: { label: 'Veteriner kontrolü', icon: '🩺', hint: 'Veteriner muayenesi planlandı.' },
  treatment_followup: { label: 'Tedavi takibi', icon: '💊', hint: 'Ateş (normal 38-39,5°C), iştah, geviş, süt ve dışkıyı kontrol edin. Düzelme yoksa veterineri arayın.' },
  deworming: { label: 'Parazit uygulaması', icon: '🪱', hint: 'İç-dış parazit ilacı. Sağmal hayvanda sütte arınması olmayan ilacı seçin (örn. eprinomektin).' },
  hoof_care: { label: 'Tırnak bakımı', icon: '🦶', hint: 'Tırnak kesimi ve kontrolü; topallık varsa erken müdahale verim kaybını önler.' },
  calf_care: { label: 'Yavru bakımı', icon: '🍼', hint: 'İlk 2 saatte ağız sütü (canlı ağırlığın yaklaşık onda biri), göbeğe iyot; 60. günde sütten kesme.' },
};

export const EVENT_META: Record<EventType, { label: string; icon: string; color: string }> = {
  milk: { label: 'Süt', icon: '🥛', color: '#E3F2FD' },
  vaccine: { label: 'Aşı', icon: '💉', color: '#E8F5E9' },
  insemination: { label: 'Tohumlama', icon: '🧬', color: '#F3E5F5' },
  birth: { label: 'Doğum', icon: '🐮', color: '#FFF3E0' },
  treatment: { label: 'Tedavi', icon: '💊', color: '#FFEBEE' },
  feed: { label: 'Yem', icon: '🌾', color: '#FFF8E1' },
  check: { label: 'Kontrol', icon: '🩺', color: '#EDE7F6' },
};

export const BREEDS: Record<'sigir' | 'koyun' | 'keci', string[]> = {
  sigir: ['Holstein', 'Simental', 'Montofon (Esmer)', 'Jersey', 'Yerli Kara', 'Doğu Anadolu Kırmızısı', 'Melez'],
  koyun: ['Akkaraman', 'Morkaraman', 'İvesi', 'Merinos', 'Kıvırcık', 'Sakız', 'Melez'],
  keci: ['Kıl keçisi', 'Saanen', 'Kilis', 'Ankara (Tiftik)', 'Halep (Şam)', 'Melez'],
};

export const SPECIES_META = {
  sigir: { label: 'Sığır', icon: '🐄' },
  koyun: { label: 'Koyun', icon: '🐑' },
  keci: { label: 'Keçi', icon: '🐐' },
} as const;

export const SUPPORTS = [
  {
    title: 'Sürü Yöneticisi İstihdamı Desteği',
    who: 'En az 40 baş anaç sığır / 250 baş koyun-keçi işletmeleri',
    amount: 'Aylık asgari ücret desteği',
    deadline: '2026-11-30',
  },
  {
    title: 'Buzağı Desteği',
    who: 'Kayıtlı ve küpeli, suni tohumlamadan doğan buzağılar',
    amount: 'Baş başına destek',
    deadline: '2026-12-15',
  },
  {
    title: 'Hastalıktan Ari İşletme Desteği',
    who: 'Brusella ve tüberkülozdan ari sertifikalı işletmeler',
    amount: 'Baş başına ek destek',
    deadline: '2027-01-31',
  },
];

export const DISCLAIMER = 'Bu bir tanı değildir, veterinerinize danışın.';
