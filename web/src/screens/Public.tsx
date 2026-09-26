import { useState, type FormEvent, type ReactNode } from 'react';
import { DEMO_EMAIL, DEMO_PASS, login, loginDemo, signup, type User } from '../lib/auth';

const go = (h: string) => { window.location.hash = h; };

function Brand({ light }: { light?: boolean }) {
  return (
    <a href="#/" className={`brand ${light ? 'light' : ''}`}>
      <span className="brand-logo">🐄</span>
      <span>SürüCep</span>
    </a>
  );
}

function PublicNav({ onDemo }: { onDemo: () => void }) {
  return (
    <header className="pub-nav">
      <div className="pub-wrap row between">
        <Brand />
        <nav className="row pub-links">
          <a href="#/" onClick={(e) => { e.preventDefault(); document.getElementById('ozellikler')?.scrollIntoView({ behavior: 'smooth' }); }}>Özellikler</a>
          <a href="#/" onClick={(e) => { e.preventDefault(); document.getElementById('nasil')?.scrollIntoView({ behavior: 'smooth' }); }}>Nasıl çalışır?</a>
          <button className="lnk" onClick={onDemo}>Demoyu dene</button>
          <a href="#/giris" className="btn-sm ghost">Giriş yap</a>
          <a href="#/kayit" className="btn-sm">Ücretsiz kayıt ol</a>
        </nav>
      </div>
    </header>
  );
}

const FEATURES = [
  { icon: '🗓️', title: 'Sürü Sağlık Takvimi', text: 'Aşı, kızgınlık, gebelik ve doğum tarihleri kendiliğinden hesaplanır. Dikkat, Bugün, Bu hafta, Yaklaşan diye tek ekranda görünür.' },
  { icon: '🎤', title: 'Sesle kayıt', text: '"Sarıkız bugün 12 litre süt verdi" demeniz yeter. Yazı yazmadan kayıt tutulur.' },
  { icon: '🚫', title: 'İlaç arınma uyarısı', text: 'Tedavi girilince sütün ve etin kaç gün satılamayacağı hesaplanır, hayvan kartında kırmızı uyarı çıkar.' },
  { icon: '🏷️', title: 'QR hayvan pasaportu', text: 'Her hayvana QR etiket. Besici, alıcı, veteriner ve kooperatif okuttuğunda her biri kendine uygun ekranı görür.' },
  { icon: '🩺', title: 'Veterinere tek tuş', text: 'Son tedaviler ve aşılar hazır bir mesaja dönüşür, WhatsApp ile veterinere gider.' },
  { icon: '💰', title: 'Hayvan başına kâr/zarar', text: 'Süt geliri, yem ve tedavi giderinden hangi hayvanın kazandırdığını görürsünüz.' },
];

export function Landing({ onAuth }: { onAuth: (u: User) => void }) {
  const [busy, setBusy] = useState(false);
  const demo = async () => {
    setBusy(true);
    onAuth(await loginDemo());
  };
  return (
    <div className="pub">
      <PublicNav onDemo={demo} />

      <section className="hero">
        <div className="pub-wrap hero-grid">
          <div className="col" style={{ gap: 20 }}>
            <span className="pill">🌾 5-50 baş hayvanlı aile işletmeleri için</span>
            <h1 className="hero-title">Sürünüzün sağlığı <span>cebinizde.</span></h1>
            <p className="hero-sub">
              Aşı, tohumlama, doğum, tedavi ve süt kayıtlarını sesle tutun. Kritik tarihleri SürüCep hatırlatsın, ilaçlı sütün satışını engellesin, veterinerinize tek tuşla ulaşın.
            </p>
            <div className="row wrap" style={{ gap: 12 }}>
              <a href="#/kayit" className="btn big">Ücretsiz başla →</a>
              <button className="btn big outline-w" onClick={demo} disabled={busy}>▶ Demo hesabıyla dene</button>
            </div>
            <div className="row wrap hero-trust">
              <span>✓ İnternetsiz çalışır</span>
              <span>✓ KVKK uyumlu</span>
              <span>✓ Telefon ve bilgisayarda</span>
            </div>
          </div>

          <div className="hero-mock" aria-hidden>
            <div className="mock-top"><span /><span /><span /></div>
            <div className="mock-body">
              <div className="mock-title">🗓️ Sürü Sağlık Takvimi</div>
              {[
                ['red', '⚠️', 'Dikkat', '1 gecikmiş aşı · 1 tedavi', '2'],
                ['green', '📌', 'Bugün', 'Karakız kızgınlık kontrolü', '2'],
                ['yellow', '📅', 'Bu hafta', '3 aşı · 1 veteriner kontrolü', '4'],
                ['blue', '🔭', 'Yaklaşan', '2 doğum · 1 tohumlama takibi', '5'],
              ].map(([tone, ic, t, s, n]) => (
                <div key={t} className={`mock-card tone-${tone}`}>
                  <span style={{ fontSize: 22 }}>{ic}</span>
                  <span className="grow"><b>{t}</b><br /><small>{s}</small></span>
                  <b className="mock-num">{n}</b>
                </div>
              ))}
              <div className="mock-voice">🎤 "Pamuk'a antibiyotik yaptım" → <b style={{ color: '#ffcdd2' }}>Süt satılamaz: 4 gün</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-band">
        <div className="pub-wrap stats-grid">
          <div><b>283</b><span>gün sonra doğum otomatik hesaplanır</span></div>
          <div><b>3 sn</b><span>sesle bir kayıt girme süresi</span></div>
          <div><b>0 ₺</b><span>ilaçlı süt cezası riski</span></div>
          <div><b>4 rol</b><span>tek QR ile besici, alıcı, veteriner, kooperatif</span></div>
        </div>
      </section>

      <section id="ozellikler" className="pub-section">
        <div className="pub-wrap">
          <h2 className="sec-title">Besicinin ihtiyacı olan her şey, tek yerde</h2>
          <p className="sec-sub">Okuma-yazması zayıf bir besici bile yardımsız kullanabilsin diye büyük düğmeler, renkler ve ses.</p>
          <div className="feat-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feat">
                <span className="feat-ic">{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="nasil" className="pub-section alt">
        <div className="pub-wrap">
          <h2 className="sec-title">3 adımda başlayın</h2>
          <div className="steps">
            {[
              ['1', 'Hesap açın', 'Ad, telefon ve köyünüzü girin. 30 saniye sürer.'],
              ['2', 'Hayvanlarınızı ekleyin', 'Küpe no ve isim yeterli. Her hayvana QR etiket otomatik oluşur.'],
              ['3', 'Konuşun, gerisini bırakın', 'Sesle kayıt girin. Takvim, uyarılar ve raporlar kendiliğinden oluşur.'],
            ].map(([n, t, s]) => (
              <div key={n} className="step">
                <span className="step-n">{n}</span>
                <h3>{t}</h3>
                <p>{s}</p>
              </div>
            ))}
          </div>
          <div className="center" style={{ marginTop: 32 }}>
            <a href="#/kayit" className="btn big">Hemen ücretsiz kayıt ol →</a>
          </div>
        </div>
      </section>

      <footer className="pub-foot">
        <div className="pub-wrap row between wrap">
          <Brand light />
          <span>Uygulama tanı koymaz; hatırlatır ve veterinerinize yönlendirir. · Verileriniz satılmaz (KVKK).</span>
        </div>
      </footer>
    </div>
  );
}

function AuthLayout({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="auth">
      <div className="auth-side">
        <Brand light />
        <div className="col" style={{ gap: 14 }}>
          <h2 style={{ fontSize: 34, margin: 0, lineHeight: 1.15 }}>Kritik tarihleri kaçırmayın.</h2>
          <p style={{ opacity: 0.85, margin: 0 }}>Aşı, kızgınlık, doğum ve ilaç arınma süreleri SürüCep'te. Sesle kayıt, QR pasaport, veterinere tek tuş.</p>
          <div className="auth-quote">"Eskiden deftere yazıyordum, kaybediyordum. Şimdi söylüyorum, o hatırlatıyor."<br /><small>— Ahmet Y., Yeşilyurt</small></div>
        </div>
        <small style={{ opacity: 0.7 }}>🔒 Verileriniz cihazınızda saklanır ve satılmaz.</small>
      </div>
      <div className="auth-main">
        <div className="auth-box">
          <a href="#/" className="muted small">← Ana sayfa</a>
          <h1 style={{ fontSize: 30, margin: '12px 0 4px' }}>{title}</h1>
          <p className="muted" style={{ marginTop: 0 }}>{sub}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="col" style={{ gap: 6 }}>
      <span className="bold small">{label}</span>
      {children}
    </label>
  );
}

export function Login({ onAuth }: { onAuth: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      onAuth(await login(email, pw));
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Hesabınıza giriş yapın" sub="Çiftliğinizin bugünkü işleri sizi bekliyor.">
      <form className="col" style={{ gap: 14 }} onSubmit={submit}>
        <Field label="E-posta"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" autoComplete="email" /></Field>
        <Field label="Şifre"><input className="input" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••" autoComplete="current-password" /></Field>
        {err && <div className="form-err">{err}</div>}
        <button className="btn big" disabled={busy}>Giriş yap</button>
        <button type="button" className="btn outline" style={{ color: 'var(--primary)', borderColor: 'var(--primary)' }} disabled={busy} onClick={async () => { setBusy(true); onAuth(await loginDemo()); }}>
          ▶ Demo hesabıyla gir
        </button>
        <span className="xs muted center">Demo: {DEMO_EMAIL} / {DEMO_PASS}</span>
        <p className="center">Hesabınız yok mu? <a href="#/kayit" onClick={() => go('/kayit')}>Ücretsiz kayıt olun</a></p>
      </form>
    </AuthLayout>
  );
}

export function Signup({ onAuth }: { onAuth: (u: User) => void }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', village: '', password: '', password2: '' });
  const [demo, setDemo] = useState(true);
  const [kvkk, setKvkk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (f.password.length < 6) return setErr('Şifre en az 6 karakter olmalı.');
    if (f.password !== f.password2) return setErr('Şifreler eşleşmiyor.');
    if (!kvkk) return setErr('Devam etmek için KVKK aydınlatma metnini onaylayın.');
    setBusy(true);
    setErr(null);
    try {
      onAuth(await signup({ ...f, demo }));
    } catch (x) {
      setErr((x as Error).message);
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Ücretsiz hesap oluşturun" sub="30 saniyede çiftliğinizi kurun.">
      <form className="col" style={{ gap: 14 }} onSubmit={submit}>
        <Field label="Ad Soyad"><input className="input" required value={f.name} onChange={set('name')} placeholder="Ahmet Yılmaz" autoComplete="name" /></Field>
        <div className="form-2">
          <Field label="Telefon"><input className="input" required value={f.phone} onChange={set('phone')} placeholder="05xx xxx xx xx" inputMode="tel" autoComplete="tel" /></Field>
          <Field label="Köy / İlçe"><input className="input" required value={f.village} onChange={set('village')} placeholder="Yeşilyurt" /></Field>
        </div>
        <Field label="E-posta"><input className="input" type="email" required value={f.email} onChange={set('email')} placeholder="ornek@mail.com" autoComplete="email" /></Field>
        <div className="form-2">
          <Field label="Şifre"><input className="input" type="password" required value={f.password} onChange={set('password')} placeholder="En az 6 karakter" autoComplete="new-password" /></Field>
          <Field label="Şifre (tekrar)"><input className="input" type="password" required value={f.password2} onChange={set('password2')} autoComplete="new-password" /></Field>
        </div>
        <label className="check">
          <input type="checkbox" checked={demo} onChange={(e) => setDemo(e.target.checked)} />
          <span>Örnek çiftlik verisiyle başla (8 inek, 30 günlük kayıt). Denemek için önerilir.</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={kvkk} onChange={(e) => setKvkk(e.target.checked)} />
          <span>
            <b>KVKK aydınlatma metnini</b> okudum. Kayıtlarım cihazımda tutulur, satılmaz. Veterinere yalnızca ben "Gönder" dediğimde bilgi gider. QR etiketinde kişisel bilgi yoktur.
          </span>
        </label>
        {err && <div className="form-err">{err}</div>}
        <button className="btn big" disabled={busy}>Hesabımı oluştur</button>
        <p className="center">Zaten hesabınız var mı? <a href="#/giris">Giriş yapın</a></p>
      </form>
    </AuthLayout>
  );
}
