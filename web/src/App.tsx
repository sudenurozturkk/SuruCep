import { useEffect, useState } from 'react';
import { initNotifications } from './lib/notify';
import AddAnimal from './screens/AddAnimal';
import AddEvent from './screens/AddEvent';
import AnimalDetail from './screens/AnimalDetail';
import Animals from './screens/Animals';
import Home from './screens/Home';
import Passport, { TokenResolver } from './screens/Passport';
import Scan from './screens/Scan';
import Supports from './screens/Supports';
import Guide from './screens/Guide';
import Vet from './screens/Vet';
import Voice from './screens/Voice';
import { StoreProvider, useStore, type Route } from './store';
import { DOT } from './ui/kit';
import Shell from './ui/Shell';
import { Landing, Login, Signup } from './screens/Public';
import { currentUser, logout, type User } from './lib/auth';
import { initDb } from './data/db';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const u = currentUser();
    if (u) initDb(u.id, undefined, { name: u.name, phone: u.phone, village: u.village });
    return u;
  });
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const onAuth = (u: User) => {
    initDb(u.id, undefined, { name: u.name, phone: u.phone, village: u.village });
    setUser(u);
    // QR deep link ile gelindiyse girişten sonra o hayvana devam et
    if (!/^#\/a\//.test(window.location.hash)) window.location.hash = '/';
  };
  const onLogout = () => {
    logout();
    setUser(null);
    window.location.hash = '/';
  };

  if (!user) {
    const path = hash.replace(/^#/, '');
    if (path.startsWith('/kayit')) return <Signup onAuth={onAuth} />;
    if (path.startsWith('/giris') || path.startsWith('/a/')) return <Login onAuth={onAuth} />;
    return <Landing onAuth={onAuth} />;
  }

  return (
    <StoreProvider key={user.id}>
      <Root user={user} onLogout={onLogout} />
    </StoreProvider>
  );
}

function renderRoute(r: Route) {
  switch (r.name) {
    case 'home': return <Home />;
    case 'animals': return <Animals />;
    case 'animal': return <AnimalDetail key={r.id} id={r.id} showQr={r.showQr} />;
    case 'addEvent': return <AddEvent key={`${r.animalId}-${r.type}-${r.vet}`} animalId={r.animalId} type={r.type} vet={r.vet} />;
    case 'addAnimal': return <AddAnimal />;
    case 'voice': return <Voice key={r.animalId ?? 0} animalId={r.animalId} />;
    case 'vet': return <Vet />;
    case 'supports': return <Supports />;
    case 'guide': return <Guide />;
    case 'scan': return <Scan />;
    case 'token': return <TokenResolver token={r.token} />;
    case 'passport': return <Passport key={`${r.id}-${r.role}`} id={r.id} role={r.role} />;
  }
}

function Root({ user, onLogout }: { user: User; onLogout: () => void }) {
  const st = useStore();
  useEffect(() => {
    initNotifications();
  }, []);

  return (
    <>
      <Shell user={user} onLogout={onLogout}>{renderRoute(st.route)}</Shell>
      <BannerView />
      <OfflineDot />
    </>
  );
}

function BannerView() {
  const { banner, hideBanner } = useStore();
  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(hideBanner, 9000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner]);
  if (!banner) return null;
  return (
    <div className="banner" style={{ borderLeftColor: DOT[banner.tone] }} onClick={hideBanner} role="status">
      <div className="bold" style={{ fontSize: 20 }}>{banner.icon} {banner.title}</div>
      <div className="muted" style={{ fontSize: 17, marginTop: 4 }}>{banner.body}</div>
    </div>
  );
}

/** NFR-05: internet yokken de çalıştığını göstermek için küçük gösterge */
function OfflineDot() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (online) return null;
  return (
    <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', background: '#37474F', color: '#fff', padding: '8px 16px', borderRadius: 999, fontSize: 15, zIndex: 30 }}>
      📴 Çevrimdışı — kayıtlar cihazda tutuluyor
    </div>
  );
}
