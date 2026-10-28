'use client';
import { useState } from 'react';
import { speak, splitMora } from '@/lib/speech';
import type { Item, Lang } from '@/lib/types';

export function PlayButton({ text, lang, rate = 1, big = false }: { text: string; lang: Lang; rate?: number; big?: boolean }) {
  const [playing, setPlaying] = useState(false);
  return (
    <button
      type="button"
      aria-label="Ouvir"
      onClick={async (e) => {
        e.stopPropagation();
        setPlaying(true);
        await speak(text, lang, rate);
        setPlaying(false);
      }}
      className={`grid place-items-center rounded-full bg-accent text-accent-ink transition active:scale-95 ${big ? 'h-20 w-20' : 'h-11 w-11'} ${playing ? 'animate-pulse' : ''}`}
    >
      <svg viewBox="0 0 24 24" className={big ? 'h-9 w-9' : 'h-5 w-5'} fill="currentColor">
        <path d="M4 9v6h4l5 4V5L8 9zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
      </svg>
    </button>
  );
}

/** Controles completos: normal, lento, repetir em loop e (japonês) por mora. */
export function AudioBar({ item, lang, rate }: { item: Item; lang: Lang; rate: number }) {
  const [looping, setLooping] = useState(false);
  const loop = async () => {
    setLooping(true);
    for (let i = 0; i < 3; i++) {
      await speak(item.text_original, lang, rate);
      await new Promise((r) => setTimeout(r, 600));
    }
    setLooping(false);
  };
  const morae = lang === 'ja' ? splitMora(item.text_original) : [];
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <PlayButton text={item.text_original} lang={lang} rate={rate} />
        <button className="chip h-9 px-3" onClick={() => speak(item.text_original, lang, 0.55)}>🐢 Lento</button>
        <button className="chip h-9 px-3" disabled={looping} onClick={loop}>🔁 {looping ? 'Repetindo…' : 'Repetir 3×'}</button>
      </div>
      {morae.length > 1 && morae.length <= 14 && (
        <div className="flex flex-wrap justify-center gap-1">
          {morae.map((m, i) => (
            <button key={i} onClick={() => speak(m, lang, 0.7)} className="rounded-lg border border-line bg-surface px-2 py-1 font-jp text-lg">
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
