import QRCode from 'qrcode';
import type { Animal } from '../data/types';

// NFR-10: QR içinde yalnızca tahmin edilemeyen token var; küpe no ya da kişisel veri yok.
export function qrPayload(a: Animal): string {
  return `${window.location.origin}/a/${a.qr_token}`;
}

const TOKEN_RX = /(?:surucep:\/\/a\/|\/a\/)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function tokenFrom(text: string): string | null {
  return text.match(TOKEN_RX)?.[1]?.toLowerCase() ?? null;
}

// NFR-13: yüksek hata düzeltme (Level H) — kirli/yıpranmış etiket okunabilir
export function qrDataUrl(a: Animal, size = 512): Promise<string> {
  return QRCode.toDataURL(qrPayload(a), { errorCorrectionLevel: 'H', margin: 2, width: size, color: { dark: '#1C1B18', light: '#FFFFFF' } });
}

/** FR-14: QR + küpe no + isimle etiket görseli (PNG) */
export async function labelBlob(a: Animal): Promise<Blob> {
  const W = 800, H = 1000;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = '#2E7D32';
  g.lineWidth = 16;
  g.strokeRect(8, 8, W - 16, H - 16);
  g.fillStyle = '#2E7D32';
  g.fillRect(8, 8, W - 16, 110);
  g.fillStyle = '#fff';
  g.font = 'bold 52px system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText('SürüCep Hayvan Pasaportu', W / 2, 82);
  const img = new Image();
  img.src = await qrDataUrl(a, 600);
  await img.decode();
  g.drawImage(img, (W - 600) / 2, 140, 600, 600);
  g.fillStyle = '#1C1B18';
  g.font = 'bold 84px system-ui, sans-serif';
  g.fillText(a.name, W / 2, 840);
  g.font = '600 50px ui-monospace, monospace';
  g.fillText(a.ear_tag, W / 2, 920);
  return new Promise((res) => c.toBlob((b) => res(b!), 'image/png'));
}

/** Tek dokunuşla paylaşım menüsü; desteklenmiyorsa PNG indirir */
export async function shareLabel(a: Animal): Promise<'shared' | 'downloaded'> {
  const blob = await labelBlob(a);
  const file = new File([blob], `SuruCep-${a.name}-${a.ear_tag}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: `${a.name} QR etiketi`, text: `${a.name} · ${a.ear_tag}` });
      return 'shared';
    } catch {
      /* iptal — indirmeye düş */
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}

/** Yazdır / PDF olarak kaydet: A4'te 6 etiket */
export async function printLabel(a: Animal) {
  const src = await qrDataUrl(a, 600);
  const w = window.open('', '_blank');
  if (!w) return;
  const one = `<div class="l"><div class="h">SürüCep</div><img src="${src}"/><b>${a.name}</b><code>${a.ear_tag}</code></div>`;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${a.name} QR etiketi</title>
<style>@page{size:A4;margin:10mm}body{font-family:system-ui,sans-serif;margin:0}
.g{display:grid;grid-template-columns:1fr 1fr;gap:8mm}
.l{border:3px solid #2E7D32;border-radius:4mm;padding:4mm;text-align:center;display:flex;flex-direction:column;align-items:center;gap:1mm;break-inside:avoid}
.h{background:#2E7D32;color:#fff;font-weight:700;width:100%;padding:1mm 0;border-radius:2mm}
img{width:55mm;height:55mm}b{font-size:20pt}code{font-size:13pt}</style></head>
<body><div class="g">${one.repeat(6)}</div></body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 600);
}
