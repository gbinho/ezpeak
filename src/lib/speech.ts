'use client';
import type { Lang } from './types';

const VOICE_LANG: Record<Lang, string> = { en: 'en-US', ja: 'ja-JP', ru: 'ru-RU', fr: 'fr-FR' };

function pickVoice(lang: Lang) {
  const voices = window.speechSynthesis.getVoices();
  const target = VOICE_LANG[lang];
  const matches = voices.filter((v) => v.lang.replace('_', '-').startsWith(target.slice(0, 2)));
  // Vozes "natural"/"neural"/Google soam melhor que as padrão do sistema.
  return (
    matches.find((v) => /natural|neural|google|online/i.test(v.name) && v.lang.startsWith(target)) ??
    matches.find((v) => v.lang.startsWith(target)) ??
    matches[0]
  );
}

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, lang: Lang, rate = 1): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = VOICE_LANG[lang];
    u.rate = rate;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}

/** Divide kana em moras (きょ, っ, ー ficam juntos com o anterior). */
export function splitMora(kana: string) {
  const out: string[] = [];
  for (const ch of kana) {
    if (/[ゃゅょャュョぁぃぅぇぉァィゥェォー]/.test(ch) && out.length) out[out.length - 1] += ch;
    else out.push(ch);
  }
  return out;
}

// ---------- Reconhecimento de fala (avaliação de pronúncia) ----------

type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function canRecognize() {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function recognize(lang: Lang, locale?: string): { promise: Promise<{ transcripts: string[]; confidence: number }>; stop: () => void } {
  const w = window as unknown as Record<string, new () => SR>;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  const rec = new Ctor();
  rec.lang = locale ?? VOICE_LANG[lang];
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  rec.continuous = false;
  const promise = new Promise<{ transcripts: string[]; confidence: number }>((resolve, reject) => {
    let done = false;
    rec.onresult = (e) => {
      done = true;
      const alts = Array.from(e.results[0]);
      resolve({ transcripts: alts.map((a) => a.transcript), confidence: alts[0]?.confidence ?? 0 });
    };
    rec.onerror = (e) => {
      done = true;
      reject(new Error(e.error));
    };
    rec.onend = () => {
      if (!done) resolve({ transcripts: [], confidence: 0 });
    };
  });
  rec.start();
  return { promise, stop: () => rec.stop() };
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[.,!?¿¡'"’“”。、！？…\s]/g, '')
    .replace(/[ァ-ン]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60)); // katakana → hiragana

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

export function similarity(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Nota 0–100 comparando as alternativas do reconhecedor com os alvos aceitos. */
export function scorePronunciation(transcripts: string[], targets: string[], confidence: number) {
  let best = 0;
  let bestTranscript = transcripts[0] ?? '';
  for (const t of transcripts)
    for (const target of targets) {
      const s = similarity(t, target);
      if (s > best) {
        best = s;
        bestTranscript = t;
      }
    }
  // Confiança do reconhecedor pesa pouco: só quebra empates em acertos.
  const score = Math.round(best * 90 + (best > 0.9 ? Math.min(confidence, 1) * 10 : 0));
  return { score: Math.min(100, score), transcript: bestTranscript };
}

/** Marca palavra a palavra (inglês) o que o reconhecedor ouviu. */
export function wordDiff(target: string, heard: string) {
  const heardWords = heard.toLowerCase().replace(/[^a-z'\s]/g, '').split(/\s+/);
  return target.split(/\s+/).map((w) => {
    const clean = w.toLowerCase().replace(/[^a-z']/g, '');
    const best = Math.max(0, ...heardWords.map((h) => similarity(h, clean)));
    return { word: w, ok: best >= 0.8, partial: best >= 0.5 && best < 0.8 };
  });
}

// ---------- Gravação para comparar com o nativo ----------

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => chunks.push(e.data);
  rec.start();
  return {
    stop: () =>
      new Promise<string>((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        };
        rec.stop();
      }),
  };
}
