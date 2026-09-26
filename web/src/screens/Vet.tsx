import { useState } from 'react';
import { withdrawalFor } from '../logic/animal';
import { animalSummary, callPhone, openWhatsApp } from '../logic/share';
import { useStore } from '../store';
import { Avatar, Btn, Card, Disclaimer, Screen, Section } from '../ui/kit';

export default function Vet() {
  const st = useStore();
  const { farm, animals, events, reminders, drugs, today } = st;
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState(farm.vet_name);
  const [phone, setPhone] = useState(farm.vet_phone);

  // Arınmada olanlar üstte
  const sorted = [...animals].sort((a, b) => Number(!!withdrawalFor(b.id, events, drugs, today)) - Number(!!withdrawalFor(a.id, events, drugs, today)));

  return (
    <Screen title="📞 Veteriner">
      <Card>
        <div className="row">
          <span style={{ width: 64, height: 64, borderRadius: 32, background: '#dce7f5', display: 'grid', placeItems: 'center', fontSize: 34 }}>🩺</span>
          <div className="grow">
            <div className="bold" style={{ fontSize: 22 }}>{farm.vet_name}</div>
            <div className="muted">{farm.vet_phone}</div>
          </div>
          <button className="icon-btn" style={{ fontSize: 22, border: '2px solid var(--line)' }} onClick={() => setEdit(!edit)} aria-label="Düzenle">✏️</button>
        </div>
        {edit && (
          <div className="col">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Veteriner adı" />
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xx xxx xx xx" inputMode="tel" />
            <Btn label="Kaydet" onClick={() => { st.updateFarm({ vet_name: name, vet_phone: phone }); setEdit(false); }} />
          </div>
        )}
        <Btn big icon="📞" label="Hemen ara" color="var(--blue)" onClick={() => callPhone(farm.vet_phone)} />
        <Btn icon="💬" label="WhatsApp'tan yaz" color="var(--wa)" onClick={() => openWhatsApp(farm.vet_phone, `Merhaba ${farm.vet_name}, ben ${farm.owner_name}. `)} />
      </Card>

      <Section title="🐄 Hayvan özetini gönder">
        <span className="small muted">Son 3 tedavi ve aşı, arınma durumu ve gebelik bilgisi hazır mesaj olarak gider.</span>
        {sorted.map((a) => {
          const w = withdrawalFor(a.id, events, drugs, today);
          return (
            <Card key={a.id} level={w && w.milkDaysLeft > 0 ? 'red' : undefined} onClick={() => openWhatsApp(farm.vet_phone, animalSummary(a, farm, events, reminders, drugs, today))}>
              <div className="row">
                <Avatar animal={a} size={48} />
                <span className="grow bold" style={{ fontSize: 20 }}>{a.name}</span>
                <span style={{ fontSize: 26 }}>💬</span>
              </div>
            </Card>
          );
        })}
      </Section>
      <Disclaimer />
    </Screen>
  );
}
