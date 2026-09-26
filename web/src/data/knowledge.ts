import type { Species } from './types';

// ============================================================================
// SürüCep bilgi tabanı — üreme, aşı ve ilaç verileri.
// Kaynak: veteriner hekimlik ders kitaplarında ve Bakanlık hayvan sağlığı
// uygulamalarında yaygın kabul gören ortalama değerler. İlaç arınma süreleri
// ürüne (firma, doz, uygulama yolu) göre değişir: her zaman prospektüs ve
// veteriner hekimin talimatı esastır. Uygulama tanı koymaz.
// ============================================================================

export interface Repro {
  label: string;
  cycleDays: number; // kızgınlık döngüsü (ortalama)
  cycleRange: string;
  heatDuration: string; // kızgınlığın sürdüğü süre
  breedAfterHeat: string; // tohumlama/aşım zamanı
  pregCheckDays: number; // tohumlamadan sonra gebelik muayenesi
  pregCheckMethod: string;
  gestationDays: number; // ortalama gebelik süresi
  gestationRange: string;
  dryOffBeforeBirth: number | null; // doğumdan kaç gün önce kuruya çıkarılır
  prebirthVaccineBefore: number; // doğumdan kaç gün önce anneye aşı (yavru ishali / enterotoksemi)
  prebirthVaccineName: string;
  postpartumCheckDays: number; // doğum sonrası veteriner kontrolü
  voluntaryWaitDays: number | null; // doğumdan sonra ilk tohumlama için bekleme süresi
  firstBreeding: string; // ilk tohumlama yaşı/ağırlığı
  seasonal: string | null;
  heatSigns: string[];
}

export const REPRO: Record<Species, Repro> = {
  sigir: {
    label: 'Sığır',
    cycleDays: 21,
    cycleRange: '18-24 gün',
    heatDuration: '12-18 saat',
    breedAfterHeat: 'Sabah kızgınlık görülürse akşam, akşam görülürse ertesi sabah tohumlatın (sabah-akşam kuralı). Durgun kızgınlıktan 12 saat sonra idealdir.',
    pregCheckDays: 35,
    pregCheckMethod: 'Ultrason ile 28-35. gün, elle (rektal) muayene ile 40-60. gün',
    gestationDays: 283,
    gestationRange: '279-287 gün',
    dryOffBeforeBirth: 60,
    prebirthVaccineBefore: 42,
    prebirthVaccineName: 'Buzağı ishali (E. coli/Rota/Corona) aşısı',
    postpartumCheckDays: 30,
    voluntaryWaitDays: 50,
    firstBreeding: 'Düveler 14-16 aylık ve yetişkin ağırlığının %55-60\'ına ulaşınca (Holştayn ~350-400 kg)',
    seasonal: null,
    heatSigns: [
      'Başka hayvan üzerine atlayınca hareketsiz durma (en kesin belirti)',
      'Huzursuzluk, sık böğürme, diğerlerine binme',
      'Vulvada şişlik, kızarıklık; berrak, ipliksi akıntı',
      'İştah ve süt veriminde ani düşüş',
      'Kuyruk sokumunda tüy dökülmesi, kirlenme',
    ],
  },
  koyun: {
    label: 'Koyun',
    cycleDays: 17,
    cycleRange: '14-19 gün',
    heatDuration: '24-36 saat',
    breedAfterHeat: 'Koç katımı ile doğal aşım; suni tohumlamada kızgınlık başladıktan 12-18 saat sonra.',
    pregCheckDays: 45,
    pregCheckMethod: 'Ultrason ile 40-50. gün',
    gestationDays: 150,
    gestationRange: '144-152 gün',
    dryOffBeforeBirth: null,
    prebirthVaccineBefore: 35,
    prebirthVaccineName: 'Enterotoksemi aşısı (kuzu koruması için)',
    postpartumCheckDays: 21,
    voluntaryWaitDays: null,
    firstBreeding: '7-9 aylık ve yetişkin ağırlığının %60-70\'i (ırka göre)',
    seasonal: 'Mevsime bağlı: kızgınlık çoğunlukla sonbahar (Ağustos-Kasım) aylarında görülür.',
    heatSigns: ['Koça yaklaşma, koç yanında durma', 'Kuyruk sallama, huzursuzluk', 'Vulvada hafif şişlik, akıntı (belirtiler zayıftır, koç ile tespit en güvenlisi)'],
  },
  keci: {
    label: 'Keçi',
    cycleDays: 21,
    cycleRange: '18-22 gün',
    heatDuration: '24-48 saat',
    breedAfterHeat: 'Kızgınlık başladıktan 12-24 saat sonra aşım/tohumlama.',
    pregCheckDays: 45,
    pregCheckMethod: 'Ultrason ile 40-50. gün',
    gestationDays: 150,
    gestationRange: '145-155 gün',
    dryOffBeforeBirth: 60,
    prebirthVaccineBefore: 35,
    prebirthVaccineName: 'Enterotoksemi aşısı (oğlak koruması için)',
    postpartumCheckDays: 21,
    voluntaryWaitDays: null,
    firstBreeding: '7-10 aylık ve yetişkin ağırlığının %60-70\'i',
    seasonal: 'Mevsime bağlı: kızgınlık çoğunlukla sonbahar aylarında görülür.',
    heatSigns: ['Sık meleme, kuyruk sallama (bayrak sallama)', 'Vulvada kızarıklık ve akıntı', 'Tekeye ilgi, iştah azalması'],
  },
};

// ---------------------------------------------------------------------------
// Aşı programı. species: hangi türler; firstAgeDays: ilk doz yaşı;
// boosterDays: ilk dozdan sonraki rapel (0 = yok); repeatDays: sonraki tekrar
// aralığı (0 = tek doz); femaleOnly: yalnız dişilere.
// ---------------------------------------------------------------------------
export interface VaccineInfo {
  name: string;
  aliases: string;
  species: Species[];
  firstAgeDays: number;
  boosterDays: number;
  repeatDays: number;
  femaleOnly?: boolean;
  pregnantOnly?: boolean;
  price: number;
  schedule: string; // besiciye gösterilen sade açıklama
  note?: string;
}

export const VACCINES: VaccineInfo[] = [
  {
    name: 'Şap aşısı', aliases: 'şap', species: ['sigir', 'koyun', 'keci'],
    firstAgeDays: 120, boosterDays: 30, repeatDays: 180, price: 0,
    schedule: 'İlk doz 4 aylıkken, 1 ay sonra rapel, sonra 6 ayda bir',
    note: 'Bakanlık kampanyalarıyla (ilkbahar-sonbahar) ücretsiz yapılır.',
  },
  {
    name: 'Nodüler ekzantem (LSD) aşısı', aliases: 'nodüler,ekzantem,lsd,deri', species: ['sigir'],
    firstAgeDays: 90, boosterDays: 0, repeatDays: 365, price: 0,
    schedule: '3 aylıktan itibaren, yılda bir (tercihen sinek mevsiminden önce, ilkbahar)',
  },
  {
    name: 'Brusella aşısı (S19)', aliases: 'brusella,brucella,s19', species: ['sigir'],
    firstAgeDays: 120, boosterDays: 0, repeatDays: 0, femaleOnly: true, price: 0,
    schedule: 'Yalnız dişi buzağılara 3-6 aylıkken tek doz',
    note: 'Bakanlık programında ücretsiz. Aşılı hayvan küpe kaydına işlenir.',
  },
  {
    name: 'Brusella aşısı (Rev-1)', aliases: 'rev1,rev-1', species: ['koyun', 'keci'],
    firstAgeDays: 120, boosterDays: 0, repeatDays: 0, femaleOnly: true, price: 0,
    schedule: 'Yalnız dişi kuzu/oğlaklara 3-6 aylıkken tek doz',
  },
  {
    name: 'IBR-BVD aşısı', aliases: 'ibr,bvd', species: ['sigir'],
    firstAgeDays: 150, boosterDays: 28, repeatDays: 180, price: 400,
    schedule: 'İlk doz 5 aylıkken, 3-4 hafta sonra rapel, sonra 6 ayda bir (tohumlamadan önce yapılması önerilir)',
  },
  {
    name: 'Enterotoksemi aşısı', aliases: 'enterotoksemi,klostridyum,karma', species: ['sigir', 'koyun', 'keci'],
    firstAgeDays: 60, boosterDays: 28, repeatDays: 180, price: 250,
    schedule: 'İlk doz 2 aylıkken, 4 hafta sonra rapel, sonra 6 ayda bir. Gebe koyun/keçide doğumdan 4-6 hafta önce',
  },
  {
    name: 'Şarbon aşısı', aliases: 'şarbon,antraks', species: ['sigir', 'koyun', 'keci'],
    firstAgeDays: 180, boosterDays: 0, repeatDays: 365, price: 0,
    schedule: '6 aylıktan büyüklere yılda bir (riskli bölgelerde)',
  },
  {
    name: 'Pastörella (Septisemi) aşısı', aliases: 'pastörella,pastorella,septisemi,zatürre', species: ['sigir', 'koyun', 'keci'],
    firstAgeDays: 90, boosterDays: 28, repeatDays: 180, price: 200,
    schedule: 'İlk doz 3 aylıkken, 4 hafta sonra rapel, sonra 6 ayda bir (sonbahar-kış öncesi)',
  },
  {
    name: 'Theileria (Tropikal theileriosis) aşısı', aliases: 'theileria,teileria,kene', species: ['sigir'],
    firstAgeDays: 60, boosterDays: 0, repeatDays: 0, price: 300,
    schedule: '2 aylıktan büyüklere tek doz (kene mevsiminden önce); bağışıklık uzun sürelidir',
  },
  {
    name: 'Buzağı ishali (E. coli/Rota/Corona) aşısı', aliases: 'ishal,rota,corona,koli', species: ['sigir'],
    firstAgeDays: 0, boosterDays: 21, repeatDays: 0, pregnantOnly: true, price: 450,
    schedule: 'Gebe ineklere doğumdan 6 hafta önce, 3 hafta sonra rapel (buzağı ağız sütüyle korunur)',
  },
  {
    name: 'Koyun-keçi çiçeği aşısı', aliases: 'çiçek,cicek', species: ['koyun', 'keci'],
    firstAgeDays: 90, boosterDays: 0, repeatDays: 365, price: 0,
    schedule: '3 aylıktan itibaren yılda bir',
  },
  {
    name: 'PPR (Küçük ruminant vebası) aşısı', aliases: 'ppr,veba', species: ['koyun', 'keci'],
    firstAgeDays: 90, boosterDays: 0, repeatDays: 1095, price: 0,
    schedule: '3 aylıktan büyüklere tek doz, 3 yılda bir tekrar',
  },
];

// ---------------------------------------------------------------------------
// İlaçlar ve arınma (bekleme) süreleri — gün. Değerler piyasadaki yaygın
// ürünlerin prospektüs aralığındadır; ürün değişirse süre de değişir.
// ---------------------------------------------------------------------------
export interface DrugInfo {
  name: string;
  category: string;
  aliases: string;
  milk: number;
  meat: number;
  price: number;
  note?: string;
}

export const MEDICINES: DrugInfo[] = [
  { name: 'Penisilin-Streptomisin', category: 'Antibiyotik', aliases: 'penisilin,streptomisin,antibiyotik', milk: 4, meat: 30, price: 850, note: 'Süt 72-96 saat' },
  { name: 'Oksitetrasiklin (uzun etkili)', category: 'Antibiyotik', aliases: 'oksitetrasiklin,tetrasiklin,antibiyotik', milk: 7, meat: 28, price: 700 },
  { name: 'Seftiofur', category: 'Antibiyotik', aliases: 'seftiofur,antibiyotik', milk: 0, meat: 8, price: 1200, note: 'Sütte bekleme yok (sodyum tuzu)' },
  { name: 'Enrofloksasin', category: 'Antibiyotik', aliases: 'enrofloksasin,baytril,antibiyotik', milk: 4, meat: 14, price: 650 },
  { name: 'Tilosin', category: 'Antibiyotik', aliases: 'tilosin,antibiyotik', milk: 4, meat: 21, price: 550 },
  { name: 'Meme içi tüp (Mastitis)', category: 'Antibiyotik', aliases: 'meme,tüp,mastit,mastitis', milk: 5, meat: 7, price: 450, note: 'Son uygulamadan itibaren sayılır' },
  { name: 'Kuru dönem tüpü', category: 'Antibiyotik', aliases: 'kuru dönem,kuruya', milk: 35, meat: 28, price: 500, note: 'Kuruya çıkarırken; doğumdan en az 35 gün önce' },
  { name: 'Flunixin (Ağrı kesici)', category: 'Ağrı / Ateş', aliases: 'flunixin,ağrı,ateş', milk: 2, meat: 10, price: 380, note: 'Süt 36 saat' },
  { name: 'Meloksikam', category: 'Ağrı / Ateş', aliases: 'meloksikam', milk: 5, meat: 15, price: 420 },
  { name: 'İvermektin (Parazit)', category: 'Parazit', aliases: 'ivermektin,parazit,kurt', milk: 28, meat: 49, price: 300, note: 'Sağmal hayvanda KULLANILMAZ; kuru dönemde doğumdan 60 gün önce' },
  { name: 'Eprinomektin (dökme)', category: 'Parazit', aliases: 'eprinomektin,dökme', milk: 0, meat: 15, price: 450, note: 'Sağmal inekte kullanılabilir' },
  { name: 'Albendazol', category: 'Parazit', aliases: 'albendazol', milk: 3, meat: 14, price: 250 },
  { name: 'Vitamin AD3E', category: 'Vitamin', aliases: 'vitamin,ad3e', milk: 0, meat: 0, price: 200 },
  { name: 'Kalsiyum serumu', category: 'Serum', aliases: 'kalsiyum,serum,süt humması', milk: 0, meat: 0, price: 350 },
  { name: 'Oksitosin', category: 'Hormon', aliases: 'oksitosin', milk: 0, meat: 0, price: 150 },
  { name: 'Kloprostenol (PGF2α)', category: 'Hormon', aliases: 'kloprostenol,pgf,senkronizasyon', milk: 0, meat: 1, price: 250, note: 'Kızgınlık senkronizasyonu; gebe hayvanda yavru attırır' },
  { name: 'GnRH', category: 'Hormon', aliases: 'gnrh,buserelin', milk: 0, meat: 0, price: 300 },
];

// ---------------------------------------------------------------------------
// Rutin sağlık takipleri (tamamlanınca bir sonrakini SürüCep kendisi planlar)
// ---------------------------------------------------------------------------
export const ROUTINES: Record<'deworming' | 'hoof_care', { label: string; days: Record<Species, number>; text: string }> = {
  deworming: {
    label: 'Parazit uygulaması',
    days: { sigir: 120, koyun: 90, keci: 90 },
    text: 'Sığırda 4 ayda bir, küçükbaşta 3 ayda bir (özellikle ilkbahar meraya çıkışta ve sonbahar ahıra girişte). Yavrularda ilk uygulama 2-3 aylıkken.',
  },
  hoof_care: {
    label: 'Tırnak bakımı',
    days: { sigir: 180, koyun: 90, keci: 90 },
    text: 'Sığırda yılda 2 kez (kuruya çıkarırken ve laktasyon ortasında), küçükbaşta 3 ayda bir tırnak kesimi.',
  },
};

export const FOLLOWUP = {
  treatmentDays: 3, // antibiyotik/ateş tedavisinden sonra sonuç kontrolü
  weaningDays: 60, // yavru sütten kesme
};
