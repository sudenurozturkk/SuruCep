import { SUPPORTS } from '../data/catalog';
import { fmtDate, relDay } from '../lib/date';
import { useStore } from '../store';
import { Card, Screen, Tag } from '../ui/kit';

// FR-12 (P2): statik örnek liste
export default function Supports() {
  const { today } = useStore();
  return (
    <Screen title="🏛️ Destekler">
      <span className="muted">Çiftliğinize uygun olabilecek Bakanlık destekleri (örnek liste).</span>
      {SUPPORTS.map((s) => (
        <Card key={s.title} level="yellow">
          <span className="bold" style={{ fontSize: 21 }}>{s.title}</span>
          <span className="muted">👥 {s.who}</span>
          <span>💰 {s.amount}</span>
          <Tag level="yellow" label={`⏳ Son başvuru: ${fmtDate(s.deadline)} (${relDay(today, s.deadline)})`} />
        </Card>
      ))}
      <span className="xs muted">Güncel tutar ve şartlar için İl/İlçe Tarım ve Orman Müdürlüğü'ne danışın.</span>
    </Screen>
  );
}
