'use client';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { personalDeckId, wordsToCards } from '@/lib/personal-deck';
import { canRecognize, makeUtterance, recognize, speak } from '@/lib/speech';
import { toPt } from '@/lib/translate';
import { useTrack } from '@/lib/track';
import type { Lang } from '@/lib/types';
import Activity from './Activity';

type News = { title: string; titlePt: string | null; url: string; date: string; summary: string; image: string | null };
type Step = 'list' | 'read' | 'rate' | 'explain' | 'result';
type Difficulty = 'fácil' | 'médio' | 'difícil';

// Dificuldades que a pessoa pode apontar, e o que o app sugere para cada uma.
const REASONS = [
  { id: 'words', label: 'Muitas palavras que eu não conhecia', tip: 'As palavras grifadas viram cards. Revise-as nos próximos dias.' },
  { id: 'audio', label: 'Ouvi a notícia e não entendi bem', tip: 'Treine escuta: faça o Ditado em Praticar e ouça as notícias em velocidade lenta.' },
  { id: 'grammar', label: 'Frases longas e difíceis de montar', tip: 'Faça Montar a frase para se acostumar com a ordem das palavras.' },
  { id: 'idea', label: 'Perdi a ideia geral', tip: 'Leia o título e o primeiro parágrafo duas vezes antes de seguir. Comece por notícias mais curtas.' },
] as const;

/** Divide em palavras clicáveis (funciona também para japonês). */
function tokens(text: string, lang: Lang) {
  const seg = new Intl.Segmenter(lang, { granularity: 'word' });
  return [...seg.segment(text)].map((s) => ({ t: s.segment, i: s.index, word: !!s.isWordLike }));
}

export default function Reading({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { session, global, saveGlobal } = useApp();
  useTrack('reading');
  const [step, setStep] = useState<Step>('list');
  const [items, setItems] = useState<News[] | null>(null);
  const [news, setNews] = useState<News | null>(null);
  const [paras, setParas] = useState<string[] | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [listened, setListened] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [reasons, setReasons] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState('');
  const [feedback, setFeedback] = useState<{ score: number; got: string; missed: string; tip: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    fetch(`/api/news?lang=${lang}`)
      .then((r) => r.json())
      .then(async (j) => {
        if (!j.items) return setError(j.error);
        setItems(j.items);
        const pt = await toPt(j.items.map((i: News) => i.title));
        setItems(j.items.map((i: News, k: number) => ({ ...i, titlePt: pt[k] })));
      });
  }, [lang]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const text = useMemo(() => [news?.title ?? '', ...(paras ?? [])].join('\n'), [news, paras]);

  async function open(n: News) {
    setNews(n);
    setStep('read');
    setParas(null);
    setImage(n.image);
    const j = await fetch(`/api/news?lang=${lang}&url=${encodeURIComponent(n.url)}`).then((r) => r.json());
    setParas(j.paragraphs?.length ? j.paragraphs : [n.summary]);
    if (j.image) setImage(j.image);
  }

  // ---------- leitor: frase por frase, com pausa e a palavra falada em destaque ----------
  const blocks = useMemo(() => (news && paras ? [news.title, ...paras] : []), [news, paras]);
  const sentences = useMemo(() => {
    const seg = new Intl.Segmenter(lang, { granularity: 'sentence' });
    return blocks.flatMap((b, p) =>
      [...seg.segment(b)]
        .map((s) => ({ p, start: s.index + (s.segment.length - s.segment.trimStart().length), end: s.index + s.segment.length, text: s.segment.trim() }))
        .filter((s) => s.text),
    );
  }, [blocks, lang]);
  const [cur, setCur] = useState<{ s: number; w?: [number, number] } | null>(null);
  const [slow, setSlow] = useState(false);
  const idx = useRef(0);
  const run = useRef(0);

  function playFrom(i: number) {
    if (i >= sentences.length) {
      setPlaying(false);
      setCur(null);
      idx.current = 0;
      return;
    }
    const token = run.current;
    idx.current = i;
    const s = sentences[i];
    const u = makeUtterance(s.text, lang, (slow ? 0.75 : 0.95) * global.audioRate);
    u.onboundary = (e) => {
      if (e.name !== 'word' || token !== run.current) return;
      const len = e.charLength || (s.text.slice(e.charIndex).search(/[\s,.;:!?、。]/) + 1 || s.text.length - e.charIndex);
      setCur({ s: i, w: [s.start + e.charIndex, s.start + e.charIndex + len] });
    };
    u.onend = () => token === run.current && playFrom(i + 1);
    setCur({ s: i });
    window.speechSynthesis.speak(u);
  }

  function play() {
    window.speechSynthesis.cancel();
    run.current++;
    setPlaying(true);
    setListened(true);
    playFrom(idx.current);
  }

  function pause() {
    run.current++; // invalida o "onend" da frase cancelada
    window.speechSynthesis.cancel();
    setPlaying(false);
  }

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

  async function evaluate() {
    setStep('result');
    setFeedback(null);
    try {
      setFeedback(await callAI('comprehension', { article: text, summary, language: lang }));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function makeCards() {
    if (!session) return;
    const words = [...marked].slice(0, 15);
    setCards({ done: 0, total: words.length });
    await personalDeckId(session.user.id, lang);
    await wordsToCards(session.user.id, lang, words, text, (n) => setCards({ done: n, total: words.length }));
  }

  async function speakSummary() {
    try {
      // Explicação em português: mede compreensão sem travar na produção no idioma.
      const { transcripts } = await recognize(lang, 'pt-BR').promise;
      if (transcripts[0]) setSummary((s) => `${s} ${transcripts[0]}`.trim());
    } catch {
      setError('Não consegui ouvir. Permita o microfone ou digite.');
    }
  }

  // ---------- telas ----------
  if (step === 'list')
    return (
      <Activity title="Ler notícias" onBack={onBack}>
        {error && <p className="my-auto text-center text-sm text-muted">{error}</p>}
        {!items && !error && <p className="my-auto text-center text-muted">Buscando notícias…</p>}
        <div className="divide-y divide-line">
          {items?.map((n) => (
            <button key={n.url} onClick={() => open(n)} className="flex w-full items-center gap-3 py-4 text-left">
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug">{n.titlePt ?? n.title}</span>
                {n.titlePt && <span className="block text-sm leading-snug text-muted">{n.title}</span>}
                <span className="hint">{n.date && new Date(n.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              {n.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={n.image} alt="" loading="lazy" className="h-16 w-20 shrink-0 rounded-lg bg-surface-2 object-cover" />
              )}
            </button>
          ))}
        </div>
      </Activity>
    );

  if (step === 'read') {
    const sent = cur ? sentences[cur.s] : null;
    return (
      <Activity
        title={marked.size ? `${marked.size} palavras grifadas` : 'Toque nas palavras que não entendeu'}
        onBack={() => { pause(); idx.current = 0; setCur(null); setStep('list'); setMarked(new Set()); setListened(false); }}
        action={
          <button
            onClick={() => saveGlobal({ tapAudio: !global.tapAudio })}
            aria-label={global.tapAudio ? 'Desligar som ao tocar na palavra' : 'Ligar som ao tocar na palavra'}
            title={global.tapAudio ? 'Som ao tocar: ligado' : 'Som ao tocar: desligado'}
            className={`grid h-11 w-11 place-items-center rounded-full ${global.tapAudio ? 'text-accent' : 'text-muted'}`}
          >
            {global.tapAudio ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </button>
        }
        footer={
          <div className="flex gap-2">
            <button onClick={playing ? pause : play} disabled={!paras} className="btn-ghost shrink-0" aria-label={playing ? 'Pausar leitura' : 'Ouvir a notícia'}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={() => { setSlow(!slow); if (playing) { pause(); setTimeout(play, 50); } }} className={`btn-ghost shrink-0 px-3 text-sm tabular-nums ${slow ? 'text-accent' : ''}`} aria-label="Velocidade">
              {slow ? '0.75×' : '1×'}
            </button>
            <button className="btn-primary flex-1" disabled={!paras} onClick={() => { pause(); setStep('rate'); }}>Terminei</button>
          </div>
        }
      >
        <article lang={lang} className="space-y-4 pt-2 text-lg leading-relaxed">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="aspect-video w-full rounded-xl bg-surface-2 object-cover" />
          )}
          {!paras && <p className="text-muted">Carregando a notícia…</p>}
          {blocks.map((p, i) => (
            <p key={i} className={i === 0 ? 'font-display text-2xl font-bold leading-tight' : ''}>
              {i === 0 && news?.titlePt && <span className="mb-1 block font-sans text-sm font-normal text-muted">{news.titlePt}</span>}
              {tokens(p, lang).map((tk, j) => {
                const inSentence = sent && sent.p === i && tk.i >= sent.start && tk.i < sent.end;
                const spoken = inSentence && cur?.w && tk.word && tk.i >= cur.w[0] && tk.i < cur.w[1];
                const cls = spoken ? 'bg-accent text-accent-ink' : marked.has(tk.t.toLowerCase()) ? 'bg-warn/40' : inSentence ? 'bg-accent-soft' : '';
                return tk.word ? (
                  <span key={j} onClick={() => toggle(tk.t)} className={`cursor-pointer rounded-sm transition-colors ${cls || 'hover:bg-surface-2'}`}>{tk.t}</span>
                ) : (
                  <span key={j} className={inSentence ? 'bg-accent-soft' : ''}>{tk.t}</span>
                );
              })}
            </p>
          ))}
          {news && <a href={news.url} target="_blank" rel="noreferrer" className="block text-xs text-muted underline">Fonte original</a>}
        </article>
      </Activity>
    );
  }

  if (step === 'rate')
    return (
      <Activity
        title="Como foi?"
        onBack={() => setStep('read')}
        footer={<button className="btn-primary w-full" disabled={!difficulty} onClick={() => setStep('explain')}>Continuar</button>}
      >
        <div className="my-auto space-y-6">
          <div className="grid grid-cols-3 gap-2">
            {(['fácil', 'médio', 'difícil'] as Difficulty[]).map((d) => (
              <button key={d} onClick={() => setDifficulty(d)} className={`card py-4 font-semibold capitalize ${difficulty === d ? 'border-accent bg-accent-soft text-accent' : ''}`}>{d}</button>
            ))}
          </div>
          {difficulty && difficulty !== 'fácil' && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted">O que pegou?</p>
              {REASONS.filter((r) => r.id !== 'audio' || listened).map((r) => (
                <label key={r.id} className="card flex items-center gap-3 p-3">
                  <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={reasons.has(r.id)} onChange={() => { const s = new Set(reasons); if (s.has(r.id)) s.delete(r.id); else s.add(r.id); setReasons(s); }} />
                  <span className="text-sm">{r.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </Activity>
    );

  if (step === 'explain')
    return (
      <Activity
        title="O que você entendeu?"
        onBack={() => setStep('rate')}
        footer={
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setStep('result')}>Pular</button>
            <button className="btn-primary flex-1" disabled={summary.trim().length < 10} onClick={evaluate}>Avaliar</button>
          </div>
        }
      >
        <div className="my-auto space-y-3">
          <p className="text-sm text-muted">Conte em português, com suas palavras, do que a notícia fala. Pode falar ou digitar.</p>
          <textarea className="field min-h-36 resize-none" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="A notícia fala sobre…" />
          {canRecognize() && <button className="btn-ghost w-full" onClick={speakSummary}>Falar</button>}
        </div>
      </Activity>
    );

  const tips = REASONS.filter((r) => reasons.has(r.id));
  return (
    <Activity
      title="Resultado"
      onBack={() => setStep('explain')}
      footer={<button className="btn-primary w-full" onClick={() => { setStep('list'); setMarked(new Set()); setReasons(new Set()); setDifficulty(null); setSummary(''); setFeedback(null); setCards(null); setListened(false); }}>Outra notícia</button>}
    >
      <div className="space-y-4 pt-2">
        {summary && (
          <section className="card space-y-2 p-4">
            {!feedback && !error && <p className="text-sm text-muted">Avaliando o que você entendeu…</p>}
            {error && <p className="text-sm text-muted">{error}</p>}
            {feedback && (
              <>
                <p className="font-display text-3xl font-extrabold">{feedback.score}<span className="text-base text-muted">/100</span></p>
                <p className="text-sm"><b>Entendeu:</b> {feedback.got}</p>
                {feedback.missed && <p className="text-sm"><b>Faltou:</b> {feedback.missed}</p>}
                <p className="text-sm text-muted">{feedback.tip}</p>
              </>
            )}
          </section>
        )}

        {marked.size > 0 && (
          <section className="card space-y-3 p-4">
            <p className="text-sm font-semibold">{marked.size} palavras grifadas</p>
            <div className="flex flex-wrap gap-1.5">{[...marked].map((w) => <span key={w} className="rounded-md bg-warn/30 px-2 py-0.5 text-sm">{w}</span>)}</div>
            <button className="btn-primary w-full" disabled={!!cards} onClick={makeCards}>
              {!cards ? 'Criar cards com essas palavras' : cards.done < cards.total ? `Criando… ${cards.done}/${cards.total}` : `${cards.done} cards em Minhas palavras`}
            </button>
          </section>
        )}

        {tips.length > 0 && (
          <section className="space-y-2">
            <p className="text-sm font-semibold text-muted">Para melhorar</p>
            {tips.map((t) => <p key={t.id} className="card p-3 text-sm">{t.tip}</p>)}
          </section>
        )}
        {difficulty === 'fácil' && <p className="card p-3 text-sm">Boa! Tente ler sem ouvir antes, ou ouvir sem ler, para se desafiar.</p>}
      </div>
    </Activity>
  );
}
