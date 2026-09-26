import { useState, type ReactNode } from 'react';
import type { User } from '../lib/auth';
import { fmtLong } from '../lib/date';
import { notifyNow } from '../lib/notify';
import { buildCalendar } from '../logic/calendar';
import { useStore, type Route } from '../store';
import { Btn } from './kit';

const MENU: { path: string; icon: string; label: string; match: Route['name'][] }[] = [
  { path: '/', icon: '📊', label: 'Panel', match: ['home'] },
  { path: '/hayvanlar', icon: '🐄', label: 'Hayvanlarım', match: ['animals', 'animal', 'addAnimal', 'addEvent'] },
  { path: '/ses', icon: '🎤', label: 'Sesli kayıt', match: ['voice'] },
  { path: '/qr', icon: '📷', label: 'QR okut', match: ['scan', 'passport', 'token'] },
  { path: '/veteriner', icon: '🩺', label: 'Veteriner', match: ['vet'] },
  { path: '/rehber', icon: '📚', label: 'Bilgi Rehberi', match: ['guide'] },
  { path: '/destekler', icon: '🏛️', label: 'Destekler', match: ['supports'] },
];

export default function Shell({ user, onLogout, children }: { user: User; onLogout: () => void; children: ReactNode }) {
  const st = useStore();
  const [demoOpen, setDemoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const active = (m: (typeof MENU)[number]) => m.match.includes(st.route.name);
  const cal = buildCalendar(st.animals, st.reminders, st.events, st.drugs, st.today);
  const badge = cal.attention.length + cal.today.length;

  const nav = (path: string) => {
    setMenuOpen(false);
    st.go(path);
  };

  const morningSummary = async () => {
    const body = `Bugün ${cal.today.length} iş, ${cal.attention.length} dikkat`;
    await notifyNow('🐄 SürüCep günaydın', body);
    st.showBanner({ icon: '☀️', title: 'Sabah özeti', body, tone: 'green' });
  };

  return (
    <div className="shell">
      <aside className={`side ${menuOpen ? 'open' : ''}`}>
        <a className="brand light" href="#/" onClick={() => setMenuOpen(false)}>
          <span className="brand-logo">🐄</span>
          <span>SürüCep</span>
        </a>
        <div className="side-farm">
          <span className="xs" style={{ opacity: 0.7 }}>Çiftlik</span>
          <b>{st.farm.owner_name}</b>
          <span className="xs" style={{ opacity: 0.8 }}>📍 {st.farm.village} · {st.animals.length} hayvan</span>
        </div>
        <nav className="side-nav">
          {MENU.map((m) => (
            <button key={m.path} className={active(m) ? 'on' : ''} onClick={() => nav(m.path)}>
              <span className="side-ic">{m.icon}</span>
              <span className="grow">{m.label}</span>
              {m.path === '/' && badge > 0 && <span className="side-badge">{badge}</span>}
            </button>
          ))}
        </nav>
        <div className="side-foot">
          <div className="row" style={{ gap: 10 }}>
            <span className="user-av">{user.name.slice(0, 1).toLocaleUpperCase('tr-TR')}</span>
            <div className="grow col" style={{ gap: 0, minWidth: 0 }}>
              <b className="ellipsis">{user.name}</b>
              <span className="xs ellipsis" style={{ opacity: 0.7 }}>{user.email}</span>
            </div>
          </div>
          <button className="side-out" onClick={onLogout}>⎋ Çıkış yap</button>
        </div>
      </aside>
      {menuOpen && <div className="side-scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button className="icon-btn burger" onClick={() => setMenuOpen(true)} aria-label="Menü">☰</button>
          <div className="grow col" style={{ gap: 0 }}>
            <span className="xs muted">{fmtLong(st.today)}{st.dayOffset ? ` (+${st.dayOffset} gün)` : ''}</span>
            <b className="topbar-title">{MENU.find(active)?.label ?? 'SürüCep'}</b>
          </div>
          <button className="top-btn" onClick={() => nav('/ses')}>🎤 <span className="hide-sm">Sesli kayıt</span></button>
          <button className="top-btn" onClick={() => nav('/yeni-hayvan')}>➕ <span className="hide-sm">Hayvan ekle</span></button>
          <button className="top-btn ghost" onClick={() => setDemoOpen(true)} title="Demo araçları">⏩ <span className="hide-sm">Demo</span></button>
        </header>
        <div className="content">{children}</div>
      </div>

      {/* Mobilde alt menü (FR-29) */}
      <nav className="bottom-bar">
        <button onClick={() => nav('/ses')} className="bb-main"><span>🎤</span>Sesli kayıt</button>
        <button onClick={() => nav('/qr')}><span>📷</span>QR okut</button>
        <button onClick={() => nav('/hayvanlar')}><span>🐄</span>Hayvanlarım</button>
      </nav>

      {demoOpen && (
        <div className="sheet-bg" onClick={() => setDemoOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="h2">⏩ Demo araçları</div>
            <div className="muted">Aradaki günler için rutin süt/yem kayıtları simüle edilir, vadesi gelen hatırlatmalar bildirim olarak düşer.</div>
            <div className="row">
              {[1, 7, 21].map((n) => (
                <Btn key={n} label={`+${n} gün`} style={{ flex: 1 }} onClick={() => { setDemoOpen(false); st.advanceDays(n); }} />
              ))}
            </div>
            <Btn outline icon="☀️" label="Sabah özeti bildirimi gönder" onClick={() => { setDemoOpen(false); morningSummary(); }} />
            <Btn
              outline
              color="var(--red)"
              icon="🔄"
              label="Örnek çiftliği yeniden yükle"
              onClick={() => {
                if (confirm('Tüm kayıtlar silinip örnek çiftlik yeniden yüklenecek. Emin misiniz?')) {
                  setDemoOpen(false);
                  st.resetDemo();
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
