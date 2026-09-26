// Tarayıcının konuşma tanıması (Web Speech API, tr-TR). Chrome/Edge/Samsung Internet destekler.
// Desteklenmezse ekran yazarak/örnek cümleyle çalışmaya devam eder.

/* eslint-disable @typescript-eslint/no-explicit-any */
const w = (typeof window !== 'undefined' ? window : {}) as any;
const SR: any = w.SpeechRecognition || w.webkitSpeechRecognition || null;

export const speechAvailable = !!SR;

export interface SpeechHandlers {
  onPartial: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (msg: string) => void;
  onEnd: () => void;
}

export function startListening(h: SpeechHandlers): () => void {
  if (!SR) {
    h.onError('Bu tarayıcıda ses tanıma yok (Chrome önerilir). Cümleyi yazabilir veya örneklerden seçebilirsiniz.');
    h.onEnd();
    return () => {};
  }
  const rec = new SR();
  rec.lang = 'tr-TR';
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e: any) => {
    let text = '';
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    if (final) h.onFinal(text);
    else h.onPartial(text);
  };
  rec.onerror = (e: any) => {
    const map: Record<string, string> = {
      'no-speech': 'Ses duyulmadı, tekrar deneyin.',
      'not-allowed': 'Mikrofon izni verilmedi.',
      network: 'Ses tanıma için internet gerekli. Cümleyi yazabilir veya örneklerden seçebilirsiniz.',
    };
    h.onError(map[e.error] ?? `Ses tanıma hatası: ${e.error}`);
  };
  rec.onend = () => h.onEnd();
  try {
    rec.start();
  } catch {
    h.onEnd();
  }
  return () => {
    try {
      rec.stop();
    } catch {
      /* zaten durdu */
    }
  };
}
