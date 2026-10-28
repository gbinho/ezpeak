'use client';
// Trecho da letra que corresponde à prévia de 30s:
// 1) transcreve a prévia no navegador com Whisper (transformers.js);
// 2) busca a letra sincronizada no LRCLIB (aberto e grátis);
// 3) acha as linhas da letra que batem com o que foi cantado e devolve só esse trecho,
//    com os tempos convertidos para a prévia.
import { similarity } from './speech';
import type { Lang } from './types';

export type Line = { start: number; end: number; text: string };
type Chunk = { timestamp: [number, number | null]; text: string };

const WHISPER_LANG: Record<Lang, string> = { en: 'english', ja: 'japanese', ru: 'russian', fr: 'french' };

let asr: Promise<(audio: Float32Array, o: object) => Promise<{ text: string; chunks?: Chunk[] }>> | null = null;

function getAsr(onProgress: (pct: number) => void) {
  if (!asr) {
    asr = import('@huggingface/transformers').then(({ pipeline }) =>
      pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
        progress_callback: (p: { status: string; progress?: number }) => p.status === 'progress' && p.progress != null && onProgress(Math.round(p.progress)),
      }) as unknown as (audio: Float32Array, o: object) => Promise<{ text: string; chunks?: Chunk[] }>,
    );
    asr.catch(() => (asr = null));
  }
  return asr;
}

async function decode16k(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  const ctx = new AudioContext({ sampleRate: 16000 });
  const audio = await ctx.decodeAudioData(buf);
  ctx.close();
  return audio.getChannelData(0);
}

function parseLrc(lrc: string): Line[] {
  const lines = lrc
    .split('\n')
    .map((l) => l.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/))
    .filter((m): m is RegExpMatchArray => !!m && !!m[3].trim())
    .map((m) => ({ start: +m[1] * 60 + +m[2], text: m[3].trim(), end: 0 }));
  lines.forEach((l, i) => (l.end = lines[i + 1]?.start ?? l.start + 5));
  return lines;
}

async function syncedLyrics(title: string, artist: string, duration: number) {
  const r = await fetch(`https://lrclib.net/api/search?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`);
  const list = ((await r.json()) as { syncedLyrics: string | null; duration: number }[]).filter((x) => x.syncedLyrics);
  list.sort((a, b) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration));
  return list[0]?.syncedLyrics ? parseLrc(list[0].syncedLyrics) : null;
}

/**
 * Descobre em que ponto da música a prévia começa: cada trecho transcrito vota no
 * deslocamento da linha da letra mais parecida; fica a mediana dos votos confiáveis.
 * Depois devolve as linhas que caem dentro da prévia, já no tempo da prévia.
 */
function align(lines: Line[], chunks: Chunk[], previewLen: number): Line[] | null {
  const votes: number[] = [];
  for (const c of chunks) {
    let best = { sim: 0, line: lines[0] };
    for (const l of lines) {
      const sim = similarity(l.text, c.text);
      if (sim > best.sim) best = { sim, line: l };
    }
    if (best.sim >= 0.55) votes.push(best.line.start - c.timestamp[0]);
  }
  if (!votes.length) return null;
  votes.sort((a, b) => a - b);
  const offset = votes[Math.floor(votes.length / 2)];
  const inside = lines
    .map((l) => ({ start: l.start - offset, end: l.end - offset, text: l.text }))
    .filter((l) => l.end > 0.5 && l.start < previewLen - 0.5)
    .map((l) => ({ ...l, start: Math.max(0, l.start), end: Math.min(previewLen, l.end) }));
  return inside.length ? inside : null;
}

export type Excerpt = { lines: Line[]; source: 'lrclib' | 'whisper' };

export async function loadExcerpt(
  song: { title: string; artist: string; preview: string; duration: number },
  lang: Lang,
  onProgress: (text: string, pct?: number) => void,
): Promise<Excerpt> {
  onProgress('Preparando a transcrição');
  const [model, audio, lyrics] = await Promise.all([
    getAsr((pct) => onProgress('Baixando o reconhecimento de voz (só na primeira vez)', pct)),
    decode16k(`/api/music?audio=${encodeURIComponent(song.preview)}`),
    syncedLyrics(song.title, song.artist, song.duration).catch(() => null),
  ]);
  onProgress('Ouvindo o trecho');
  const out = await model(audio, { language: WHISPER_LANG[lang], task: 'transcribe', return_timestamps: true, chunk_length_s: 30 });
  const chunks = (out.chunks ?? []).filter((c) => c.text.trim());
  const aligned = lyrics && chunks.length ? align(lyrics, chunks, audio.length / 16000) : null;
  if (aligned) return { lines: aligned, source: 'lrclib' };
  return {
    source: 'whisper',
    lines: chunks.map((c) => ({ start: c.timestamp[0], end: c.timestamp[1] ?? c.timestamp[0] + 4, text: c.text.trim() })),
  };
}
