import jsQR from 'jsqr';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as DB from '../data/db';
import { tokenFrom } from '../lib/qr';
import { useStore } from '../store';
import { Btn, Card, Screen } from '../ui/kit';
import { RoleSwitch } from '../ui/RoleSwitch';

// FR-15: uygulama içi QR okuyucu (kamera + jsQR, tamamen cihazda; internet gerekmez — NFR-12)
export default function Scan() {
  const st = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const open = useCallback((animalId: number) => {
    doneRef.current = true;
    DB.logScan(animalId, st.role);
    navigator.vibrate?.(80);
    st.replace(`/pasaport/${animalId}/${st.role}`);
  }, [st]);

  const handleText = useCallback((text: string) => {
    const token = tokenFrom(text);
    const a = token ? DB.findByToken(token) : undefined;
    if (a) open(a.id);
    else setMsg(token ? 'Bu QR bu çiftlikte kayıtlı değil.' : 'Bu bir SürüCep QR kodu değil.');
  }, [open]);
  const handlerRef = useRef(handleText);
  handlerRef.current = handleText;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      raf = requestAnimationFrame(tick);
      const v = videoRef.current, c = canvasRef.current;
      if (doneRef.current || !v || !c || v.readyState < 2 || ts - last < 120) return;
      last = ts;
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 480;
      c.width = w;
      c.height = h;
      const g = c.getContext('2d', { willReadFrequently: true })!;
      g.drawImage(v, 0, 0, w, h);
      const code = jsQR(g.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      if (code?.data) handlerRef.current(code.data);
    };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('insecure');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        raf = requestAnimationFrame(tick);
      } catch (e) {
        setCamError(
          (e as Error).message === 'insecure'
            ? 'Kamera için HTTPS gerekli. Aşağıdan QR fotoğrafı seçebilir veya küpe no ile arayabilirsiniz.'
            : 'Kamera açılamadı. Aşağıdan QR fotoğrafı seçebilir veya küpe no ile arayabilirsiniz.',
        );
      }
    })();
    return () => {
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const fromImage = async (f: File | undefined) => {
    if (!f) return;
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await img.decode();
    const c = document.createElement('canvas');
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    c.width = img.width * scale;
    c.height = img.height * scale;
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, c.width, c.height);
    const code = jsQR(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height);
    URL.revokeObjectURL(img.src);
    if (code?.data) handleText(code.data);
    else setMsg('Fotoğrafta QR bulunamadı. Daha yakından ve net çekin.');
  };

  // FR-22: yedek yol — küpe no (tamamı/son haneleri) veya isimle
  const search = () => {
    const a = DB.findByTagOrName(query);
    if (a) open(a.id);
    else setMsg('Bu küpe numarası/isimle hayvan bulunamadı.');
  };

  return (
    <Screen title="📷 QR Okut">
      <div className="col" style={{ gap: 6 }}>
        <span className="small muted">Kim okutuyor? (demo rol seçimi)</span>
        <RoleSwitch value={st.role} onChange={st.setRole} />
      </div>

      {!camError ? (
        <div className="video-box">
          <video ref={videoRef} playsInline muted />
          <div className="frame" />
        </div>
      ) : (
        <Card level="yellow"><span>{camError}</span></Card>
      )}
      <canvas ref={canvasRef} hidden />
      <div className="center muted">Hayvanın küpesindeki / ahırdaki QR etiketini çerçeveye getirin.</div>
      {msg && <Card level="red"><span className="bold c-red">{msg}</span></Card>}

      <Btn outline icon="🖼️" label="QR fotoğrafı seç" onClick={() => fileRef.current?.click()} />
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => fromImage(e.target.files?.[0])} />

      <Card>
        <b>🏷️ QR yok mu? Küpe no veya isimle ara</b>
        <form className="row" onSubmit={(e) => { e.preventDefault(); search(); }}>
          <input className="input grow" value={query} onChange={(e) => { setQuery(e.target.value); setMsg(null); }} placeholder="Örn: 345603 veya Pamuk" />
          <Btn label="Ara" onClick={search} disabled={!query.trim()} />
        </form>
      </Card>
    </Screen>
  );
}
