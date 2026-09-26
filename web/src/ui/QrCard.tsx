import { useEffect, useState } from 'react';
import type { Animal, ShareSettings } from '../data/types';
import { printLabel, qrDataUrl, shareLabel } from '../lib/qr';
import { useStore } from '../store';
import { Btn, Card } from './kit';

/** FR-13/14: hayvanın QR pasaportu + etiket paylaş/yazdır */
export function QrCard({ animal, initiallyOpen }: { animal: Animal; initiallyOpen?: boolean }) {
  const st = useStore();
  const [src, setSrc] = useState<string | null>(null);
  const [open, setOpen] = useState(!!initiallyOpen);

  useEffect(() => {
    let alive = true;
    qrDataUrl(animal, 480).then((u) => alive && setSrc(u));
    return () => { alive = false; };
  }, [animal]);

  const share = async () => {
    const r = await shareLabel(animal);
    if (r === 'downloaded') st.showBanner({ icon: '🏷️', title: 'Etiket indirildi', body: `${animal.name} için QR etiketi (PNG) kaydedildi.`, tone: 'green' });
  };

  return (
    <Card>
      <div className="row">
        {src && (
          <img src={src} alt={`${animal.name} QR`} onClick={() => setOpen(true)} style={{ width: 96, height: 96, borderRadius: 8, cursor: 'zoom-in', border: '1px solid var(--line)' }} />
        )}
        <div className="grow col" style={{ gap: 2 }}>
          <span className="bold" style={{ fontSize: 20 }}>🏷️ QR Hayvan Pasaportu</span>
          <span className="small muted">Ahıra/küpeye yapıştırın. Okutan kişinin rolüne göre farklı ekran açılır.</span>
        </div>
      </div>
      <div className="row">
        <Btn icon="📤" label="Paylaş" onClick={share} style={{ flex: 1 }} />
        <Btn outline icon="🖨️" label="Yazdır" onClick={() => printLabel(animal)} style={{ flex: 1 }} />
      </div>

      {open && src && (
        <div className="sheet-bg" style={{ alignItems: 'center' }} onClick={() => setOpen(false)}>
          <div className="card" style={{ alignItems: 'center', width: 'min(420px, 92%)', border: '6px solid var(--primary)' }}>
            <span className="bold" style={{ color: 'var(--primary)' }}>SürüCep Hayvan Pasaportu</span>
            <img className="qr-img" src={src} alt="QR" style={{ maxWidth: 340 }} />
            <span className="huge">{animal.name}</span>
            <code style={{ fontSize: 20 }}>{animal.ear_tag}</code>
            <span className="xs muted">Kapatmak için dokunun</span>
          </div>
        </div>
      )}
    </Card>
  );
}

const FIELDS: { key: keyof ShareSettings; label: string }[] = [
  { key: 'earTag', label: '🏷️ Küpe numarası' },
  { key: 'breedAge', label: '🐄 Cins ve yaş' },
  { key: 'vaccines', label: '💉 Aşı geçmişi' },
  { key: 'treatments', label: '💊 Tedavi tarihleri' },
];

/** FR-21: alıcı modunda görünecek alanlar */
export function ShareSettingsCard({ animal }: { animal: Animal }) {
  const st = useStore();
  const s = animal.share_settings;
  return (
    <Card>
      <span className="bold" style={{ fontSize: 20 }}>👁️ Alıcı QR'ı okutunca ne görsün?</span>
      {FIELDS.map((f) => (
        <label key={f.key} className="toggle">
          <span>{f.label}</span>
          <button
            className={`switch ${s[f.key] ? 'on' : ''}`}
            role="switch"
            aria-checked={s[f.key]}
            onClick={() => st.setShare(animal.id, { ...s, [f.key]: !s[f.key] })}
          />
        </label>
      ))}
      <span className="small muted">🔒 Telefonunuz, adresiniz, kâr/zarar ve notlarınız hiçbir zaman gösterilmez. Arınma durumu gıda güvenliği için her zaman görünür.</span>
      <Btn outline icon="👀" label="Alıcı gibi önizle" onClick={() => st.go(`/pasaport/${animal.id}/buyer`)} />
    </Card>
  );
}
