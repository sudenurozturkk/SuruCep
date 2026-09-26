import { useState } from 'react';
import { FOLLOWUP, MEDICINES, REPRO, ROUTINES, VACCINES } from '../data/knowledge';
import type { Species } from '../data/types';
import { Disclaimer, Screen } from '../ui/kit';

const SPECIES: { key: Species; label: string; icon: string }[] = [
  { key: 'sigir', label: 'Sığır', icon: '🐄' },
  { key: 'koyun', label: 'Koyun', icon: '🐑' },
  { key: 'keci', label: 'Keçi', icon: '🐐' },
];

const ageText = (d: number) => (d === 0 ? 'Gebelikte' : d < 60 ? `${d} günlük` : `${Math.round(d / 30)} aylık`);
const every = (d: number) => (d === 0 ? 'Tek doz' : d === 365 ? 'Yılda bir' : d === 180 ? '6 ayda bir' : d === 1095 ? '3 yılda bir' : `${d} günde bir`);

/** Bilgi Rehberi: uygulamadaki tüm hesapların dayandığı veriler */
export default function Guide() {
  const [sp, setSp] = useState<Species>('sigir');
  const r = REPRO[sp];
  const vaccines = VACCINES.filter((v) => v.species.includes(sp));

  return (
    <Screen title="📚 Bilgi Rehberi">
      <div className="role-seg" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {SPECIES.map((s) => (
          <button key={s.key} className={sp === s.key ? 'on' : ''} onClick={() => setSp(s.key)}><span>{s.icon}</span>{s.label}</button>
        ))}
      </div>

      <div className="guide-grid">
        <section className="panel">
          <h3 className="panel-title">🧬 Üreme takvimi · {r.label}</h3>
          <table className="gtable">
            <tbody>
              <tr><th>Kızgınlık döngüsü</th><td><b>{r.cycleDays} gün</b> ({r.cycleRange})</td></tr>
              <tr><th>Kızgınlık süresi</th><td>{r.heatDuration}</td></tr>
              <tr><th>Gebelik kontrolü</th><td>Tohumlamadan <b>{r.pregCheckDays}. gün</b> · {r.pregCheckMethod}</td></tr>
              <tr><th>Gebelik süresi</th><td><b>{r.gestationDays} gün</b> ({r.gestationRange})</td></tr>
              {r.dryOffBeforeBirth && <tr><th>Kuruya çıkarma</th><td>Doğumdan <b>{r.dryOffBeforeBirth} gün önce</b> (tohumlamanın {r.gestationDays - r.dryOffBeforeBirth}. günü)</td></tr>}
              <tr><th>Doğum öncesi aşı</th><td>Doğumdan {Math.round(r.prebirthVaccineBefore / 7)} hafta önce: {r.prebirthVaccineName}</td></tr>
              <tr><th>Doğum sonrası kontrol</th><td>{r.postpartumCheckDays}. gün (rahim, son, meme)</td></tr>
              {r.voluntaryWaitDays && <tr><th>Tekrar tohumlama</th><td>Doğumdan en erken <b>{r.voluntaryWaitDays}. gün</b> (bekleme süresi)</td></tr>}
              <tr><th>İlk tohumlama</th><td>{r.firstBreeding}</td></tr>
              {r.seasonal && <tr><th>Mevsimsellik</th><td>{r.seasonal}</td></tr>}
            </tbody>
          </table>
          <div className="small muted">
            SürüCep tohumlama girilince bu sürelerle hatırlatmaları kendisi oluşturur
            {sp === 'sigir' ? ': 21. gün kızgınlık, 35. gün gebelik, 223. gün kuruya çıkarma, 283. gün doğum.' : '.'}
          </div>
        </section>

        <section className="panel">
          <h3 className="panel-title">🔥 Kızgınlık nasıl anlaşılır?</h3>
          <ul className="glist">
            {r.heatSigns.map((s) => <li key={s}>{s}</li>)}
          </ul>
          <div className="tip">
            <b>⏰ Ne zaman tohumlatmalı?</b>
            <span>{r.breedAfterHeat}</span>
          </div>
          <div className="tip yellow">
            <b>Günde en az 2 kez gözleyin</b>
            <span>Sabah erken ve akşam, 20-30 dakika. Kızgınlıkların çoğu gece ve sabaha karşı başlar.</span>
          </div>
        </section>
      </div>

      <section className="panel">
        <h3 className="panel-title">💉 Aşı programı · {r.label}</h3>
        <div className="table-wrap">
          <table className="gtable wide">
            <thead>
              <tr><th>Aşı</th><th>İlk doz</th><th>Rapel</th><th>Tekrar</th><th>Açıklama</th></tr>
            </thead>
            <tbody>
              {vaccines.map((v) => (
                <tr key={v.name}>
                  <td><b>{v.name}</b>{v.femaleOnly && <span className="badge farmer" style={{ marginLeft: 6 }}>♀ yalnız dişi</span>}{v.pregnantOnly && <span className="badge vet" style={{ marginLeft: 6 }}>gebe</span>}</td>
                  <td>{ageText(v.firstAgeDays)}</td>
                  <td>{v.boosterDays ? `${Math.round(v.boosterDays / 7)} hafta sonra` : '—'}</td>
                  <td>{every(v.repeatDays)}</td>
                  <td className="small">{v.schedule}{v.note ? <><br /><span className="muted">{v.note}</span></> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="small muted">Yeni hayvan eklendiğinde yaşına, türüne ve cinsiyetine uygun aşılar takvime kendiliğinden eklenir. Aşı girildiğinde bir sonraki doz otomatik planlanır.</div>
      </section>

      <section className="panel">
        <h3 className="panel-title">🔁 Rutin sağlık takipleri (SürüCep otomatik hatırlatır)</h3>
        <table className="gtable">
          <tbody>
            <tr><th>🪱 {ROUTINES.deworming.label}</th><td><b>{ROUTINES.deworming.days[sp]} günde bir</b> · {ROUTINES.deworming.text}</td></tr>
            <tr><th>🦶 {ROUTINES.hoof_care.label}</th><td><b>{ROUTINES.hoof_care.days[sp]} günde bir</b> · {ROUTINES.hoof_care.text}</td></tr>
            <tr><th>💊 Tedavi sonrası kontrol</th><td>Antibiyotik, ateş/ağrı ilacı veya serumdan <b>{FOLLOWUP.treatmentDays} gün sonra</b>: ateş (38-39,5°C), iştah, geviş, süt, dışkı</td></tr>
            <tr><th>🍼 Yavru bakımı</th><td>Doğumda: ilk 2 saatte ağız sütü, göbeğe iyot · <b>{FOLLOWUP.weaningDays}. gün</b>: sütten kesme</td></tr>
            <tr><th>🚫 Arınma bitişi</th><td>İlaç girilince süt/et satış yasağının bittiği gün hatırlatılır</td></tr>
          </tbody>
        </table>
        <div className="small muted">"Yapıldı" dediğinizde olay kaydı oluşur ve bir sonraki tarih kendiliğinden planlanır. Aşı kampanyası günlerinde takvimdeki "Tümü yapıldı" ile tüm sürü tek tıkla işaretlenir.</div>
      </section>

      <section className="panel">
        <h3 className="panel-title">💊 İlaç arınma (bekleme) süreleri</h3>
        <div className="table-wrap">
          <table className="gtable wide">
            <thead>
              <tr><th>İlaç</th><th>Grup</th><th>Süt</th><th>Et</th><th>Not</th></tr>
            </thead>
            <tbody>
              {MEDICINES.map((m) => (
                <tr key={m.name}>
                  <td><b>{m.name}</b></td>
                  <td>{m.category}</td>
                  <td className={m.milk ? 'c-red bold' : 'c-green bold'}>{m.milk ? `${m.milk} gün` : 'Yok'}</td>
                  <td className={m.meat ? 'c-red bold' : 'c-green bold'}>{m.meat ? `${m.meat} gün` : 'Yok'}</td>
                  <td className="small muted">{m.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tip red">
          <b>⚠️ Önemli</b>
          <span>Süreler aynı etken maddenin farklı ürünlerinde değişebilir. Her zaman ilacın prospektüsüne ve veteriner hekiminizin talimatına uyun. Arınma süresindeki süt satılırsa kalıntı cezası ve halk sağlığı riski doğar.</span>
        </div>
      </section>
      <Disclaimer />
    </Screen>
  );
}
