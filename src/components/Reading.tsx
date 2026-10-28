'use client';
import { Pause, Volume2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { personalDeckId, wordsToCards } from '@/lib/personal-deck';
import { canRecognize, recognize, speak } from '@/lib/speech';
import type { Lang } from '@/lib/types';
import Activity from './Activity';

type News = { title: string; url: string; date: string; summary: string };
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
  return [...seg.segment(text)].map((s) => ({ t: s.segment, word: !!s.isWordLike }));
}

export default function Reading({ lang, onBack }: { lang: Lang; onBack: () => void }) {
  const { session, global } = useApp();
  const [step, setStep] = useState<Step>('list');
  const [items, setItems] = useState<News[] | null>(null);
  const [news, setNews] = useState<News | null>(null);
  const [paras, setParas] = useState<string[] | null>(null);
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
    fetch(`/api/news?lang=${lang}`).then((r) => r.json()).then((j) => (j.items ? setItems(j.items) : setError(j.error)));
  }, [lang]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const text = useMemo(() => [news?.title ?? '', ...(paras ?? [])].join('\n'), [news, paras]);

  async function open(n: News) {
    setNews(n);
    setStep('read');
    setParas(null);
    const j = await fetch(`/api/news?lang=${lang}&url=${encodeURIComponent(n.url)}`).then((r) => r.json());
    setParas(j.paragraphs?.length ? j.paragraphs : [n.summary]);
  }

  async function listen() {
    if (playing) {
      window.speechSynthesis.cancel();
      return setPlaying(false);
    }
    setPlaying(true);
    setListened(true);
    for (const p of [news!.title, ...(paras ?? [])]) {
      if (!window.speechSynthesis) break;
      await speak(p, lang, global.audioRate * 0.9);
      if (!document.hasFocus() && !window.speechSynthesis.speaking) break;
    }
    setPlaying(false);
  }

  const toggle = (w: string) => {
    const k = w.toLowerCase();
    const next = new Set(marked);
    if (next.has(k)) next.delete(k);
    else next.add(k);
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
            <button key={n.url} onClick={() => open(n)} className="block w-full py-4 text-left">
              <span className="block font-semibold leading-snug">{n.title}</span>
              <span className="hint">{n.date && new Date(n.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            </button>
          ))}
        </div>
      </Activity>
    );

  if (step === 'read')
    return (
      <Activity
        title={marked.size ? `${marked.size} palavras grifadas` : 'Toque nas palavras que não entendeu'}
        onBack={() => { window.speechSynthesis?.cancel(); setStep('list'); setMarked(new Set()); setListened(false); }}
        footer={
          <div className="flex gap-2">
            <button onClick={listen} className="btn-ghost shrink-0" aria-label={playing ? 'Pausar' : 'Ouvir a notícia'}>
              {playing ? <Pause className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <button className="btn-primary flex-1" disabled={!paras} onClick={() => { window.speechSynthesis?.cancel(); setPlaying(false); setStep('rate'); }}>Terminei</button>
          </div>
        }
      >
        <article lang={lang} className="space-y-4 pt-2 text-lg leading-relaxed">
          {!paras && <p className="text-muted">Carregando a notícia…</p>}
          {paras && [news!.title, ...paras].map((p, i) => (
            <p key={i} className={i === 0 ? 'font-display text-2xl font-bold leading-tight' : ''}>
              {tokens(p, lang).map((tk, j) =>
                tk.word ? (
                  <span key={j} onClick={() => toggle(tk.t)} className={`cursor-pointer rounded-sm transition ${marked.has(tk.t.toLowerCase()) ? 'bg-warn/40' : 'hover:bg-surface-2'}`}>{tk.t}</span>
                ) : (
                  <span key={j}>{tk.t}</span>
                ),
              )}
            </p>
          ))}
          {news && <a href={news.url} target="_blank" rel="noreferrer" className="block text-xs text-muted underline">Fonte original</a>}
        </article>
      </Activity>
    );

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
