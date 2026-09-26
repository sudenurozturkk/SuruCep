import { useRef, useState } from 'react';
import { BREEDS, SPECIES_META } from '../data/catalog';
import type { Purpose, Sex, Species } from '../data/types';
import { addDays } from '../lib/date';
import { fileToThumb } from '../lib/photo';
import { useStore } from '../store';
import { Btn, Chip, Screen } from '../ui/kit';

const AGES: { label: string; days: number }[] = [
  { label: 'Yeni doğan', days: 3 },
  { label: '1 aylık', days: 30 },
  { label: '3 aylık', days: 90 },
  { label: '6 aylık', days: 180 },
  { label: '1 yaş', days: 365 },
  { label: '2 yaş', days: 730 },
  { label: '3 yaş', days: 1095 },
  { label: '4 yaş', days: 1460 },
  { label: '5+ yaş', days: 1900 },
];

// FR-01: 30 saniyede hayvan ekleme — çoğu alan dokunarak seçilir. FR-13: QR otomatik oluşur.
export default function AddAnimal() {
  const st = useStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [tag, setTag] = useState('TR');
  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('sigir');
  const [breed, setBreed] = useState('Holstein');
  const [sex, setSex] = useState<Sex>('disi');
  const [purpose, setPurpose] = useState<Purpose>('sut');
  const [age, setAge] = useState(730);
  const [photo, setPhoto] = useState<string | null>(null);

  const cleanTag = tag.trim().toUpperCase().replace(/\s/g, '');
  const duplicate = st.animals.some((a) => a.ear_tag === cleanTag);
  const valid = name.trim().length > 1 && cleanTag.length >= 4 && !duplicate;

  const save = () => {
    const { animal: a, plan } = st.addAnimal({
      ear_tag: cleanTag,
      name: name.trim(),
      species,
      breed,
      sex,
      purpose,
      birth_date: addDays(st.today, -age),
      photo_url: photo,
    });
    const vac = plan.filter((r) => r.type === 'vaccine').length;
    st.showBanner({
      icon: '🏷️',
      title: `${a.name} eklendi`,
      body: `QR hayvan pasaportu oluşturuldu.
${vac ? `💉 Yaşına uygun ${vac} aşı takvime eklendi.` : '🩺 Aşı karnesi kontrolü takvime eklendi.'}`,
      tone: 'green',
    });
    st.replace(`/hayvan/${a.id}?qr=1`);
  };

  return (
    <Screen title="➕ Yeni hayvan">
      <button onClick={() => fileRef.current?.click()} className="col" style={{ alignSelf: 'center', alignItems: 'center', border: 0, background: 'none', gap: 6 }}>
        {photo
          ? <img src={photo} alt="" style={{ width: 130, height: 130, borderRadius: '50%', objectFit: 'cover' }} />
          : <span style={{ width: 130, height: 130, borderRadius: '50%', background: '#e8e2d2', display: 'grid', placeItems: 'center', fontSize: 50 }}>📷</span>}
        <span className="small muted">Fotoğraf çek / seç</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await fileToThumb(f)); }} />

      <b>Küpe numarası</b>
      <input className="input" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="TR340012345609" style={{ textTransform: 'uppercase' }} />
      {duplicate && <span className="c-red small">Bu küpe numarası zaten kayıtlı.</span>}

      <b>İsmi</b>
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Benekli" />

      <b>Türü</b>
      <div className="wrap">
        {(Object.keys(SPECIES_META) as Species[]).map((k) => (
          <Chip key={k} icon={SPECIES_META[k].icon} label={SPECIES_META[k].label} on={species === k} onClick={() => { setSpecies(k); setBreed(BREEDS[k][0]); }} />
        ))}
      </div>

      <b>Cinsi</b>
      <div className="wrap">{BREEDS[species].map((b) => <Chip key={b} label={b} on={breed === b} onClick={() => setBreed(b)} />)}</div>

      <b>Cinsiyet / amaç</b>
      <div className="wrap">
        <Chip label="♀ Dişi" on={sex === 'disi'} onClick={() => setSex('disi')} />
        <Chip label="♂ Erkek" on={sex === 'erkek'} onClick={() => { setSex('erkek'); setPurpose('besi'); }} />
        <Chip label="🥛 Süt" on={purpose === 'sut'} onClick={() => setPurpose('sut')} />
        <Chip label="🥩 Besi" on={purpose === 'besi'} onClick={() => setPurpose('besi')} />
      </div>

      <b>Yaşı</b>
      <div className="wrap">{AGES.map((a) => <Chip key={a.days} label={a.label} on={age === a.days} onClick={() => setAge(a.days)} />)}</div>

      <Btn big icon="💾" label="Kaydet ve QR oluştur" disabled={!valid} onClick={save} />
    </Screen>
  );
}
