'use client';
import { ExternalLink, Pause, Play, Repeat1, Search, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { loadExcerpt, type Excerpt } from '@/lib/lyrics';
import { wordsToCards } from '@/lib/personal-deck';
import { speak } from '@/lib/speech';
import { toPt } from '@/lib/translate';
import type { Lang } from '@/lib/types';
import Activity from './Activity';

type Song = { id: number; title: string; artist: string; album: string; cover: string; preview: string; duration: number; url: string };

const CONSENT = 'ezpeak-asr-consent';
function consent() {
  try {
    if (localStorage.getItem(CONSENT)) return true;
  } catch {}
  const ok = window.confirm('Para mostrar o que é cantado, o app baixa um reconhecedor de voz (~150 MB) uma única vez. Baixar agora?');
  if (ok) try { localStorage.setItem(CONSENT, '1'); } catch {}
  return ok;
}

function tokens(text: string, lang: Lang) {
  return [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(text)].map((s) => ({ t: s.segment, word: !!s.isWordLike }));
}

export default function Music({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { session, global, saveGlobal } = useApp();
  const [q, setQ] = useState('');
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [excerpt, setExcerpt] = useState<Excerpt | null>(null);
  const [pt, setPt] = useState<(string | null)[]>([]);
  const [status, setStatus] = useState<{ text: string; pct?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [slow, setSlow] = useState(false);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const [cards, setCards] = useState<{ done: number; total: number } | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.8);
  const fadeRef = useRef(0);
  const played = useRef(new Set<number>());

  /** Fade de volume em ~350 ms (entrada e saída suaves). */
  function fade(to: number, then?: () => void) {
    const a = audio.current;
    if (!a) return;
    const id = ++fadeRef.current;
    const from = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      if (id !== fadeRef.current) return;
      const k = Math.min(1, (now - t0) / 350);
      a.volume = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
      else then?.();
    };
    requestAnimationFrame(step);
  }
  const play = () => {
    const a = audio.current;
    if (!a) return;
    a.volume = 0;
    a.play();
    fade(volume);
  };
  const pause = () => fade(0, () => audio.current?.pause());

  async function search(e: React.FormEvent) {
    e.preventDefault();
    setSongs(null);
    setError(null);
    const j = await fetch(`/api/music?q=${encodeURIComponent(q)}`).then((r) => r.json());
    if (j.error) setError(j.error);
    setSongs(j.items ?? []);
  }

  async function open(s: Song) {
    if (!consent()) return;
    setSong(s);
    setExcerpt(null);
    setError(null);
    setMarked(new Set());
    setDone(false);
    setCards(null);
    try {
      const ex = await loadExcerpt(s, lang, (text, pct) => setStatus({ text, pct }));
      setExcerpt(ex);
      setStatus(null);
      toPt(ex.lines.map((l) => l.text)).then(setPt);
    } catch {
      setStatus(null);
      setError('Não consegui preparar este trecho. Tente outra música.');
    }
  }

  const lines = excerpt?.lines ?? [];
  const curIdx = lines.findIndex((l) => time >= l.start && time < l.end);
  const current = curIdx >= 0 ? curIdx : Math.max(0, lines.findIndex((l) => l.start > time) - 1);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.playbackRate = slow ? 0.75 : 1;
    a.preservesPitch = true;
  }, [slow, song]);

  // Repetir a linha atual.
  useEffect(() => {
    const a = audio.current;
    const l = lines[current];
    if (loop && a && l && time >= l.end - 0.05) a.currentTime = l.start;
  }, [time, loop, current, lines]);

  const seek = (t: number) => {
    const a = audio.current!;
    a.currentTime = t;
    if (a.paused) play();
  };

  const toggle = (w: string) => {
    const k = w.toLowerCase();
    const next = new Set(marked);
    if (next.has(k)) next.delete(k);
    else {
      next.add(k);
      if (global.tapAudio && !playing) speak(w, lang, 0.85);
    }
    setMarked(next);
  };

  // ---------- busca ----------
  if (!song)
    return (
      <Activity title="Aprender com música" onBack={onBack}>
        <form onSubmit={search} className="sticky top-0 flex gap-2 bg-bg pt-2 pb-3">
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Artista ou música" autoFocus />
          <button className="btn-primary shrink-0 px-3" aria-label="Buscar"><Search className="h-5 w-5" /></button>
        </form>
        {error && <p className="text-sm text-muted">{error}</p>}
        {!songs && !error && <p className="my-auto text-center text-sm text-muted">Busque um artista para ver as músicas. Você ouve um trecho de 30 segundos com a letra na tela.</p>}
        {songs?.length === 0 && <p className="text-sm text-muted">Nada encontrado.</p>}
        <div className="divide-y divide-line">
          {songs?.map((s) => (
            <button key={s.id} onClick={() => open(s)} className="flex w-full items-center gap-3 py-3 text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.cover} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg bg-surface-2 object-cover" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{s.title}</span>
                <span className="block truncate text-sm text-muted">{s.artist} · {s.album}</span>
              </span>
            </button>
          ))}
        </div>
      </Activity>
    );

  const back = () => { pause(); setSong(null); };

  /** Próxima música: outra do mesmo artista se houver; senão, qualquer uma da busca. */
  async function next() {
    if (!song) return;
    played.current.add(song.id);
    let pool = (songs ?? []).filter((s) => !played.current.has(s.id) && s.title.toLowerCase() !== song.title.toLowerCase());
    if (!pool.some((s) => s.artist === song.artist)) {
      const j = await fetch(`/api/music?q=${encodeURIComponent(song.artist)}`).then((r) => r.json());
      const more = ((j.items ?? []) as Song[]).filter((s) => !played.current.has(s.id) && s.title.toLowerCase() !== song.title.toLowerCase());
      setSongs((cur) => [...(cur ?? []), ...more.filter((m) => !(cur ?? []).some((c) => c.id === m.id))]);
      pool = [...pool, ...more];
    }
    const same = pool.filter((s) => s.artist === song.artist);
    const from = same.length ? same : pool;
    if (!from.length) return;
    pause();
    open(from[Math.floor(Math.random() * from.length)]);
  }

  // ---------- resultado ----------
  if (done)
    return (
      <Activity title={song.title} onBack={() => setDone(false)} footer={<button className="btn-primary w-full" onClick={back}>Outra música</button>}>
        <div className="space-y-4 pt-2">
          {marked.size ? (
            <section className="card space-y-3 p-4">
              <p className="text-sm font-semibold">{marked.size} palavras grifadas</p>
              <div className="flex flex-wrap gap-1.5">{[...marked].map((w) => <span key={w} className="rounded-md bg-warn/30 px-2 py-0.5 text-sm">{w}</span>)}</div>
              <button
                className="btn-primary w-full"
                disabled={!!cards}
                onClick={async () => {
                  const words = [...marked].slice(0, 15);
                  setCards({ done: 0, total: words.length });
                  await wordsToCards(session!.user.id, lang, words, lines.map((l) => l.text).join(' '), (n) => setCards({ done: n, total: words.length }));
                }}
              >
                {!cards ? 'Criar cards com essas palavras' : cards.done < cards.total ? `Criando… ${cards.done}/${cards.total}` : `${cards.done} cards em Minhas palavras`}
              </button>
            </section>
          ) : (
            <p className="card p-4 text-sm">Você não grifou nenhuma palavra. Tente ouvir sem olhar a letra para treinar a escuta.</p>
          )}
          <p className="card p-4 text-sm">Dica: ouça de novo em 0.75× repetindo cada linha até conseguir cantar junto. Cantar treina a pronúncia.</p>
        </div>
      </Activity>
    );

  // ---------- trecho ----------
  return (
    <Activity
      title={`${song.title} · ${song.artist}`}
      onBack={back}
      leading={
        // eslint-disable-next-line @next/next/no-img-element
        <img src={song.cover} alt="" className="mr-1 h-8 w-8 shrink-0 rounded-md object-cover" />
      }
      footer={
        excerpt && (
          <>
          <label className="flex items-center gap-3 text-muted">
            {volume === 0 ? <VolumeX className="h-5 w-5 shrink-0" /> : <Volume2 className="h-5 w-5 shrink-0" />}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              aria-label="Volume"
              onChange={(e) => { const v = +e.target.value; setVolume(v); fadeRef.current++; if (audio.current) audio.current.volume = v; }}
              className="w-full accent-[var(--accent)]"
            />
          </label>
          <div className="flex gap-2">
            <button onClick={() => (playing ? pause() : play())} className="btn-ghost shrink-0" aria-label={playing ? 'Pausar' : 'Tocar'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => setLoop(!loop)} className={`btn-ghost shrink-0 ${loop ? 'text-accent' : ''}`} aria-label="Repetir a linha" aria-pressed={loop}>
              <Repeat1 className="h-5 w-5" />
            </button>
            <button onClick={() => setSlow(!slow)} className={`btn-ghost shrink-0 px-3 text-sm tabular-nums ${slow ? 'text-accent' : ''}`}>{slow ? '0.75×' : '1×'}</button>
            <button onClick={next} className="btn-ghost shrink-0" aria-label="Próxima música" title="Próxima música">
              <SkipForward className="h-5 w-5" />
            </button>
            <button className="btn-primary flex-1" onClick={() => { pause(); setDone(true); }}>Terminei</button>
          </div>
          </>
        )
      }
      action={
        <button onClick={() => saveGlobal({ tapAudio: !global.tapAudio })} className={`px-2 text-xs font-semibold ${global.tapAudio ? 'text-accent' : 'text-muted'}`}>
          {global.tapAudio ? 'Som ao tocar' : 'Sem som'}
        </button>
      }
    >
      <audio
        ref={audio}
        src={`/api/music?audio=${encodeURIComponent(song.preview)}`}
        onTimeUpdate={(e) => {
          const a = e.currentTarget;
          setTime(a.currentTime);
          // Fade-out no fim da prévia (exceto quando está repetindo uma linha).
          if (!loop && a.duration && a.duration - a.currentTime < 1.2 && a.volume === volume) fade(0);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        preload="auto"
      />

      {!excerpt && (
        <div className="my-auto space-y-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={song.cover} alt="" className="mx-auto h-32 w-32 rounded-2xl object-cover" />
          {error ? <p className="text-sm text-muted">{error}</p> : (
            <>
              <p className="text-sm font-semibold">{status?.text ?? 'Carregando'}{status?.pct != null && ` · ${status.pct}%`}</p>
              <div className="mx-auto h-1 w-40 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${status?.pct ?? 15}%` }} /></div>
            </>
          )}
        </div>
      )}

      {excerpt && (
        <div className="flex flex-1 flex-col">
          {/* linha atual em destaque */}
          <div lang={lang} className="flex min-h-48 flex-col justify-center py-6 text-center">
            <p className="font-display text-3xl leading-snug font-bold">
              {tokens(lines[current]?.text ?? '', lang).map((tk, j) =>
                tk.word ? (
                  <span key={j} onClick={() => toggle(tk.t)} className={`cursor-pointer rounded-md px-0.5 ${marked.has(tk.t.toLowerCase()) ? 'bg-warn/40' : 'hover:bg-surface-2'}`}>{tk.t}</span>
                ) : (
                  <span key={j}>{tk.t}</span>
                ),
              )}
            </p>
            {pt[current] && <p className="mt-2 text-muted">{pt[current]}</p>}
          </div>

          {/* trecho completo: toque para ir até a linha */}
          <ol className="space-y-1">
            {lines.map((l, i) => (
              <li key={i}>
                <button onClick={() => seek(l.start)} className={`w-full rounded-lg px-3 py-2 text-left transition ${i === current ? 'bg-accent-soft font-semibold text-ink' : 'text-muted hover:bg-surface-2'}`}>
                  {l.text}
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-auto space-y-1 pt-6 text-xs text-muted">
            <p>Prévia de 30 s: Apple Music · Letra: {excerpt.source === 'lrclib' ? 'LRCLIB' : 'transcrição automática (pode ter erros)'}</p>
            <div className="flex gap-4">
              <a href={song.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline">Ouvir completa <ExternalLink className="h-3 w-3" /></a>
              <a href={`https://genius.com/search?q=${encodeURIComponent(`${song.artist} ${song.title}`)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 underline">Letra completa no Genius <ExternalLink className="h-3 w-3" /></a>
            </div>
          </div>
        </div>
      )}
    </Activity>
  );
}
