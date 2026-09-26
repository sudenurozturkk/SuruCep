export type Species = 'sigir' | 'koyun' | 'keci';
export type Sex = 'disi' | 'erkek';
export type Purpose = 'sut' | 'besi';
export type AnimalStatus = 'aktif' | 'satildi' | 'oldu';

export type EventType = 'vaccine' | 'insemination' | 'birth' | 'treatment' | 'milk' | 'feed' | 'check';
export type EventSource = 'manual' | 'voice' | 'sim';

// Ek 2: reminder.type değerleri
export type ReminderType =
  | 'vaccine'
  | 'heat_check'
  | 'pregnancy_check'
  | 'dry_off'
  | 'birth'
  | 'withdrawal_end'
  | 'vet_check'
  | 'treatment_followup'
  // SürüCep ek sağlık takipleri
  | 'deworming'
  | 'hoof_care'
  | 'calf_care';

export interface Farm {
  id: number;
  owner_name: string;
  phone: string;
  village: string;
  vet_name: string;
  vet_phone: string;
  milk_price: number;
}

export interface Animal {
  id: number;
  farm_id: number;
  ear_tag: string;
  name: string;
  species: Species;
  breed: string;
  sex: Sex;
  purpose: Purpose;
  birth_date: string;
  photo_url: string | null;
  status: AnimalStatus;
  qr_token: string; // UUID — QR içinde yalnızca bu bulunur (NFR-10)
  share_settings: ShareSettings;
}

/** FR-21: Alıcı modunda görünecek alanlar (arınma durumu gıda güvenliği için her zaman görünür) */
export interface ShareSettings {
  earTag: boolean;
  breedAge: boolean;
  vaccines: boolean;
  treatments: boolean;
}

export const DEFAULT_SHARE: ShareSettings = { earTag: true, breedAge: true, vaccines: true, treatments: true };

export type Role = 'owner' | 'buyer' | 'vet' | 'coop';

export interface ScanLog {
  id: number;
  animal_id: number;
  role: Role;
  scanned_at: string;
}

export interface FarmEvent {
  id: number;
  animal_id: number;
  type: EventType;
  date: string;
  value: number | null;
  unit: string | null;
  drug_id: number | null;
  cost: number | null;
  note: string | null;
  source: EventSource;
  verified_by: string | null; // null = besici girdi, dolu = veteriner adı (FR-18)
  verified_at: string | null;
}

export interface Reminder {
  id: number;
  animal_id: number;
  event_id: number | null;
  type: ReminderType;
  due_date: string;
  done: number;
  notified: number;
  drug_id: number | null; // aşı hatırlatmasında hangi aşı (Yapıldı → aşı olayı)
  note: string | null;
  postponed: number; // FR-27: erteleme sayısı
}

export interface Drug {
  id: number;
  name: string;
  kind: 'drug' | 'vaccine';
  category: string;
  aliases: string;
  milk_withdrawal_days: number;
  meat_withdrawal_days: number;
  repeat_days: number;
  price: number;
  note: string | null;
  species: string; // virgülle: sigir,koyun,keci
  first_age_days: number; // aşı: ilk doz yaşı
  booster_days: number; // aşı: ilk dozdan sonra rapel
  female_only: number;
  pregnant_only: number;
  schedule: string | null; // aşı programının sade açıklaması
}

export type NewEvent = Omit<FarmEvent, 'id' | 'verified_by' | 'verified_at'> & { verified_by?: string | null; verified_at?: string | null };
export type NewAnimal = Omit<Animal, 'id' | 'farm_id' | 'status' | 'qr_token' | 'share_settings'>;
