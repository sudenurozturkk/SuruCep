# SürüCep — Web Demo v0.1 (+ Ek 1: QR Pasaport, Ek 2: Sürü Sağlık Takvimi)

Aile işletmeleri için sürü takip asistanı. Telefon tarayıcısında uygulama gibi çalışır (PWA). İlk açılıştan sonra internetsiz de kullanılabilir.

## Akış
**Tanıtım sayfası** (`/`) → **Kayıt ol** (`#/kayit`) / **Giriş yap** (`#/giris`) → **Panel** (sol menü: Panel, Hayvanlarım, Sesli kayıt, QR okut, Veteriner, Destekler).
Jüri için tanıtım sayfasında **Demo hesabıyla dene** butonu var (demo@surucep.app / demo1234, 8 ineklik örnek çiftlik). Her hesabın çiftlik verisi ayrı tutulur.

## Otomatik sağlık takibi
Besici takip etmek zorunda kalmaz; SürüCep hatırlatır, işler tek tıkla biter (`Yapıldı` → olay kaydı + sonraki tarih):
- **Üreme (türe göre):** kızgınlık (sığır 21 / koyun 17 / keçi 21 gün), gebelik kontrolü, kuruya çıkarma, doğum (sığır 283, küçükbaş 150 gün), doğum sonrası kontrol, tekrar tohumlama (50. gün)
- **Aşılar:** yaşa, türe ve cinsiyete göre ilk doz + rapel + tekrar (Şap, LSD, Brusella S19/Rev-1, IBR-BVD, Enterotoksemi, Şarbon, Pastörella, Theileria, buzağı ishali, çiçek, PPR)
- **Tedavi:** arınma bitişi, 3. gün tedavi sonucu kontrolü
- **Rutin:** parazit uygulaması, tırnak bakımı, yavru bakımı (ağız sütü, sütten kesme)
- **Tümü yapıldı:** aşı kampanyası günlerinde tüm sürü tek tıkla

Bütün süreler ve aşı programı [src/data/knowledge.ts](src/data/knowledge.ts) dosyasında, uygulamada **Bilgi Rehberi** sayfasında.

## Çalıştırma

```bash
npm install
npm run dev        # http://localhost:5173 (bilgisayarda; kamera/mikrofon localhost'ta çalışır)
npm run phone      # aynı Wi-Fi'daki telefondan açmak için HTTPS (sertifika uyarısında "Devam et")
npm run build      # dist/ → Netlify/Vercel'e sürükle-bırak ile yayınlanabilir (HTTPS)
npm run check      # ses ayrıştırıcı testi (9/9)
```

Chrome önerilir. Sesli kayıt tarayıcının konuşma tanımasını kullanır; Chrome'da bunun için internet gerekir. İnternet yoksa ekrandaki örnek cümle butonları ve yazarak giriş aynı ayrıştırıcıyla çalışır.

## Mimari

| Katman | Seçim |
|---|---|
| Uygulama | React 19 + TypeScript + Vite, PWA (service worker ile çevrimdışı) |
| Yerel veri | Tarayıcıda yerel veritabanı: `farm, animal, event, reminder, drug, scan_log` |
| Hatırlatma | Olaydan kural motoruyla türetilir ([src/logic/rules.ts](src/logic/rules.ts)) |
| Ses | Web Speech API (tr-TR) + kural tabanlı Türkçe ayrıştırıcı ([src/logic/parser.ts](src/logic/parser.ts)) |
| QR | `qrcode` ile üretim (Level H), `jsqr` ile kameradan okuma (cihazda, internetsiz) |
| Bildirim | Service worker bildirimi + uygulama içi bant; bildirime dokununca takvim açılır |
| Takvim | [src/logic/calendar.ts](src/logic/calendar.ts): her iş tek kartta (Dikkat → Bugün → Bu hafta → Yaklaşan) |

QR içinde yalnızca rastgele bir token (UUID) vardır: `https://{alan-adi}/a/{token}`. Telefonun kendi kamerasıyla okutulunca da uygulamanın o hayvan sayfası açılır. Netlify için `public/_redirects`, Vercel için `vercel.json` hazırdır. Küpe numarası ya da kişisel veri içermez.

## Demo senaryosu (11 adım)

> Başlamadan: tanıtım sayfasında **Demo hesabıyla dene** → **Veteriner → ✏️** ile numarayı kendi WhatsApp'ınız yapın → üstteki **⏩ Demo → Örnek çiftliği yeniden yükle**.

1. **Sürü Sağlık Takvimi** açılır:
   - 🔴 Dikkat: 1 gecikmiş aşı · 1 hayvanın tedavisi sürüyor
   - 🟢 Bugün: 1 tohumlama takibi · 1 gebelik kontrolü
   - 🟡 Bu hafta: 3 aşı · 1 veteriner kontrolü
   - 🔵 Yaklaşan: 2 doğum · 1 tohumlama takibi

   **Dikkat** kartına dokunun → Duman'ın "3 gün gecikti" aşısında **Yapıldı** → kart sayısı 2'den 1'e düşer, aşı olayı ve 6 ay sonraki aşı hatırlatması otomatik oluşur.
2. Alttaki **🎤 Sesli kayıt** → "Sarıkız bugün 12 litre süt verdi" → **Evet, kaydet**.
3. **🎤** → "Pamuk'a antibiyotik yaptım" → *Penisilin-Streptomisin* → kaydet. Kartta **Süt satılamaz: 4 gün** görünür.
4. **Hayvanlarım → Karakız → Olay ekle → Tohumlama → Kaydet** → 4 hatırlatma oluşur.
5. **⏩ → +21 gün** → bildirim düşer.
6. **Pamuk → Veterinere gönder** → WhatsApp'ta hazır özet açılır.
7. **Hayvanlarım:** Sarıkız 📈 kâr, Pamuk 📉 zarar.

*QR adımları için ⏩ → Demoyu sıfırla (Karakız'ın işi yeniden "bugün" olur):*

8. **Hayvanlarım → Yeni hayvan ekle** → "Benekli" → **Kaydet ve QR oluştur** → QR etiketi büyük açılır (Paylaş / Yazdır).
9. **QR Okut** → rol **Besici** → Karakız'ın QR'ı → "Bugün: kızgınlık kontrolü" → **Yapıldı, kaydet**.
10. Pamuk'a antibiyotik gir (adım 3) → **QR Okut** → rol **Alıcı** → Pamuk'un QR'ı → yalnızca sağlık karnesi ve kırmızı "Arınma süresinde: 4 gün". Sahibin bilgileri görünmez.
11. Üstteki rol çubuğundan **Veteriner** → **Tedavi gir** → kaydet → karnede 🩺 **Veteriner onaylı** rozeti. **Kooperatif** → tek büyük "SÜT SATILAMAZ" kartı.

**QR'ı nasıl okutacaksınız?** Hayvan kartında **Yazdır** ile etiketleri kâğıda basın. Ya da **Paylaş** ile QR'ı başka bir ekrana gönderip uygulamanın kamerasıyla okutun. Kamera yoksa **QR fotoğrafı seç** veya **küpe no ile ara** (örn. `345603`) aynı ekranı açar.

## Ek 2'den yığın farkları (bilinçli)
Tailwind, Dexie, qrcode.react ve html5-qrcode yerine mevcut düz CSS, yerel depolama, `qrcode` ve `jsqr` korundu. İşlevleri aynı (Level H QR, kamera okuma, çevrimdışı), hepsi test edildi. Demo öncesi yeniden yazmak risk getirirdi. Supabase senkronu eklenirken yerel katman IndexedDB/Dexie'ye taşınabilir.

## Notlar
- İlaç arınma süreleri, aşı aralıkları ve destek listesi **örnek değerlerdir**. Gerçek ürün öncesinde veteriner onayı gerekir.
- Veriler şimdilik yalnızca bu tarayıcıda tutulur. Başka bir telefondan QR okutulunca açılabilmesi için bulut senkronu (Supabase) yol haritasındadır.
- Kapsam dışı: TÜRKVET/e-Devlet, QR ile sahiplik devri, küpe OCR.
