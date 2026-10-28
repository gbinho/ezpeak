'use client';
import { Ear, Headphones, Mic, Puzzle, Sparkles, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Activity from '@/components/Activity';
import { AudioBar, PlayButton } from '@/components/Audio';
import PronunciationCheck from '@/components/PronunciationCheck';
import Respelling from '@/components/Respelling';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { similarity, speak } from '@/lib/speech';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/types';

type Mode = 'build' | 'dictation' | 'pairs' | 'speak' | 'weak';

const MODES: { id: Mode; title: string; desc: string; icon: LucideIcon }[] = [
  { id: 'build', title: 'Montar a frase', desc: 'Ordene os blocos', icon: Puzzle },
  { id: 'dictation', title: 'Ditado', desc: 'Ouça e escreva', icon: Headphones },
  { id: 'pairs', title: 'Pares mínimos', desc: 'Qual você ouviu?', icon: Ear },
  { id: 'speak', title: 'Pronúncia', desc: 'Fale e receba uma nota', icon: Mic },
  { id: 'weak', title: 'Seus erros', desc: 'Frases com o que você mais erra', icon: Sparkles },
];

const shuffle = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5);

export default function PracticePage() {
  const { global, decks } = useApp();
  const lang = global.language;
  const [mode, setMode] = useState<Mode | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    const ids = decks.filter((d) => d.language === lang).map((d) => d.id);
    if (!ids.length) return;
    supabase.from('items').select('*').in('deck_id', ids).order('sort_order').then(({ data }) => setItems((data as Item[]) ?? []));
  }, [decks, lang]);

  if (!mode)
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold">Praticar</h1>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m, i) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`card flex p-4 text-left transition hover:border-accent active:scale-[0.98] ${i === MODES.length - 1 ? 'col-span-2 items-center gap-4' : 'aspect-square flex-col justify-between'}`}
            >
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
                <m.icon className="h-6 w-6" strokeWidth={2} aria-hidden />
              </span>
              <span>
                <span className="block font-display text-lg font-bold leading-tight">{m.title}</span>
                <span className="hint">{m.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );

  const title = MODES.find((m) => m.id === mode)!.title;
  const back = () => setMode(null);
  const pronDeck = decks.find((d) => d.language === lang && d.theme === 'pronuncia');

  switch (mode) {
    case 'build':
      return <Build title={title} onBack={back} items={items.filter((i) => (lang === 'en' ? i.text_original.includes(' ') || i.example : i.text_romanized?.includes(' ')))} lang={lang} />;
    case 'dictation':
      return <Dictation title={title} onBack={back} items={items} lang={lang} rate={global.audioRate} />;
    case 'pairs':
      return <Pairs title={title} onBack={back} items={items.filter((i) => i.deck_id === pronDeck?.id)} lang={lang} />;
    case 'speak':
      return <Speak title={title} onBack={back} items={items} lang={lang} rate={global.audioRate} />;
    case 'weak':
      return <Weak title={title} onBack={back} lang={lang} />;
  }
}

type Base = { title: string; onBack: () => void };

function Loading(p: Base) {
  return <Activity {...p}><p className="m-auto text-muted">Carregando…</p></Activity>;
}

function Result({ ok, children }: { ok: 'good' | 'warn' | 'bad'; children: React.ReactNode }) {
  const tone = ok === 'good' ? 'bg-good-soft' : ok === 'warn' ? 'bg-warn-soft' : 'bg-bad-soft';
  return <div className={`space-y-1 rounded-xl p-4 text-center ${tone}`}>{children}</div>;
}

// ---------- Montar a frase ----------
function Build({ items, lang, ...p }: Base & { items: Item[]; lang: 'en' | 'ja' }) {
  const pick = useCallback(() => {
    const it = items[Math.floor(Math.random() * items.length)];
    if (!it) return null;
    // Inglês: usa a frase de exemplo se existir. Japonês: blocos em romaji.
    const target = lang === 'en' ? (it.example ?? it.text_original) : it.text_romanized!;
    const pt = lang === 'en' ? (it.example ? it.example_pt! : it.translation_pt) : it.translation_pt;
    return { it, target, pt, words: shuffle(target.split(' ')) };
  }, [items, lang]);
  const [q, setQ] = useState(pick);
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  useEffect(() => setQ(pick()), [pick]);
  if (!q) return <Loading {...p} />;

  const answer = chosen.map((i) => q.words[i]).join(' ');
  const next = () => { setQ(pick()); setChosen([]); setChecked(null); };

  return (
    <Activity
      {...p}
      footer={
        checked === null ? (
          <>
            <div className="flex min-h-24 flex-wrap content-start justify-center gap-2">
              {q.words.map((w, i) => (
                <button key={i} disabled={chosen.includes(i)} onClick={() => setChosen([...chosen, i])} className="rounded-xl border border-line bg-surface px-3.5 py-2.5 font-semibold transition disabled:opacity-20">{w}</button>
              ))}
            </div>
            <button className="btn-primary w-full" disabled={chosen.length !== q.words.length} onClick={() => { setChecked(answer === q.target); speak(lang === 'en' ? q.target : q.it.text_original, lang); }}>Verificar</button>
          </>
        ) : (
          <button className="btn-primary w-full" onClick={next}>Próxima</button>
        )
      }
    >
      <div className="my-auto space-y-6">
        <p className="text-center text-2xl font-semibold">{q.pt}</p>
        <div className="flex min-h-14 flex-wrap justify-center gap-2 border-b-2 border-line pb-3">
          {chosen.map((i, k) => (
            <button key={k} className="rounded-xl bg-accent px-3.5 py-2.5 font-semibold text-accent-ink" onClick={() => checked === null && setChosen(chosen.filter((_, j) => j !== k))}>{q.words[i]}</button>
          ))}
        </div>
        {checked !== null && (
          <Result ok={checked ? 'good' : 'bad'}>
            <p className="font-bold">{checked ? 'Certo!' : q.target}</p>
            {lang === 'ja' && <p className="font-jp text-xl">{q.it.text_original}</p>}
            {(lang === 'ja' || !q.it.example) && <Respelling text={q.it.respelling_pt} size="md" />}
          </Result>
        )}
      </div>
    </Activity>
  );
}

// ---------- Ditado ----------
function Dictation({ items, lang, rate, ...p }: Base & { items: Item[]; lang: 'en' | 'ja'; rate: number }) {
  const pick = useCallback(() => items[Math.floor(Math.random() * items.length)] ?? null, [items]);
  const [it, setIt] = useState<Item | null>(pick);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<number | null>(null);
  useEffect(() => setIt(pick()), [pick]);
  useEffect(() => { if (it) speak(it.text_original, lang, rate); }, [it, lang, rate]);
  if (!it) return <Loading {...p} />;
  const check = () => setResult(Math.max(similarity(typed, it.text_original), it.text_romanized ? similarity(typed, it.text_romanized) : 0));
  const next = () => { setIt(pick()); setTyped(''); setResult(null); };

  return (
    <Activity
      {...p}
      footer={
        result === null ? (
          <form onSubmit={(e) => { e.preventDefault(); check(); }} className="flex gap-2">
            <input className="field" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={lang === 'ja' ? 'kana ou romaji' : 'O que você ouviu?'} />
            <button className="btn-primary" disabled={!typed.trim()}>Verificar</button>
          </form>
        ) : (
          <button className="btn-primary w-full" onClick={next}>Próxima</button>
        )
      }
    >
      <div className="my-auto flex flex-col items-center gap-4">
        <PlayButton big text={it.text_original} lang={lang} rate={rate} />
        <button className="text-sm font-semibold text-muted" onClick={() => speak(it.text_original, lang, 0.55)}>Ouvir devagar</button>
        {result !== null && (
          <Result ok={result >= 0.9 ? 'good' : result >= 0.7 ? 'warn' : 'bad'}>
            <p className="font-jp text-2xl font-bold">{it.text_original}</p>
            {it.text_romanized && <p className="text-muted">{it.text_romanized}</p>}
            <Respelling text={it.respelling_pt} />
            <p>{it.translation_pt}</p>
          </Result>
        )}
      </div>
    </Activity>
  );
}

// ---------- Pares mínimos ----------
function Pairs({ items, lang, ...p }: Base & { items: Item[]; lang: 'en' | 'ja' }) {
  const pairs = useMemo(() => {
    const out: [Item, Item][] = [];
    for (let i = 0; i + 1 < items.length; i += 2) out.push([items[i], items[i + 1]]);
    return out;
  }, [items]);
  const pick = useCallback(() => {
    const pr = pairs[Math.floor(Math.random() * pairs.length)];
    return pr ? { pair: shuffle(pr), target: pr[Math.round(Math.random())] } : null;
  }, [pairs]);
  const [q, setQ] = useState(pick);
  const [answer, setAnswer] = useState<Item | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  useEffect(() => setQ(pick()), [pick]);
  useEffect(() => { if (q) speak(q.target.text_original, lang); }, [q, lang]);
  if (!q) return <Loading {...p} />;

  return (
    <Activity
      title={`${p.title} · ${score.ok}/${score.total}`}
      onBack={p.onBack}
      footer={
        <>
          <div className="grid grid-cols-2 gap-3">
            {q.pair.map((it) => {
              const state = answer ? (it.id === q.target.id ? 'border-good bg-good-soft' : it.id === answer.id ? 'border-bad bg-bad-soft' : 'opacity-50') : '';
              return (
                <button key={it.id} disabled={!!answer} onClick={() => { setAnswer(it); setScore((s) => ({ ok: s.ok + (it.id === q.target.id ? 1 : 0), total: s.total + 1 })); }} className={`card space-y-1 p-4 transition ${state}`}>
                  <div className="font-jp text-2xl font-bold">{it.text_original}</div>
                  <Respelling text={it.respelling_pt} size="md" />
                </button>
              );
            })}
          </div>
          {answer && <button className="btn-primary w-full" onClick={() => { setQ(pick()); setAnswer(null); }}>Próximo</button>}
        </>
      }
    >
      <div className="my-auto flex flex-col items-center gap-4">
        <PlayButton big text={q.target.text_original} lang={lang} />
        {answer && q.target.tip_pt && <p className="max-w-xs text-center text-sm text-muted">{q.target.tip_pt}</p>}
      </div>
    </Activity>
  );
}

// ---------- Treino de pronúncia ----------
function Speak({ items, lang, rate, ...p }: Base & { items: Item[]; lang: 'en' | 'ja'; rate: number }) {
  const [i, setI] = useState(0);
  const it = items[i % Math.max(1, items.length)];
  if (!it) return <Loading {...p} />;
  return (
    <Activity
      {...p}
      footer={
        <>
          <PronunciationCheck key={it.id} item={it} lang={lang} />
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setI((x) => Math.max(0, x - 1))}>Anterior</button>
            <button className="btn-ghost flex-1" onClick={() => setI((x) => x + 1)}>Próxima</button>
          </div>
        </>
      }
    >
      <div className="my-auto space-y-3 text-center">
        <div className="font-jp text-4xl font-bold">{it.text_original}</div>
        {it.text_romanized && <div className="text-muted">{it.text_romanized}</div>}
        <Respelling text={it.respelling_pt} size="xl" />
        <div className="text-muted">{it.translation_pt}</div>
        <AudioBar item={it} lang={lang} rate={rate} />
      </div>
    </Activity>
  );
}

// ---------- Frases com seus pontos fracos (IA) ----------
type Sentence = { text: string; romanized: string | null; pt: string; respelling_pt: string };

function Weak({ lang, ...p }: Base & { lang: 'en' | 'ja' }) {
  const { decks } = useApp();
  const [sentences, setSentences] = useState<Sentence[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    const ids = decks.filter((d) => d.language === lang).map((d) => d.id);
    const { data: ucs } = await supabase.from('user_cards').select('item_id,lapses,difficulty').in('deck_id', ids).order('lapses', { ascending: false }).order('difficulty', { ascending: false }).limit(10);
    const itemIds = [...new Set((ucs ?? []).map((u) => u.item_id))];
    if (!itemIds.length) {
      setError('Estude alguns flashcards primeiro: as frases usam os cards que você mais erra.');
      setBusy(false);
      return;
    }
    const { data: its } = await supabase.from('items').select('*').in('id', itemIds);
    try {
      const r = await callAI<{ sentences: Sentence[] }>('sentences', { items: its, language: lang });
      setSentences(r.sentences);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Activity {...p} footer={<button className="btn-primary w-full" onClick={run} disabled={busy}>{busy ? 'Gerando…' : sentences ? 'Gerar outras' : 'Gerar frases'}</button>}>
      {error && <p className="my-auto text-center text-sm text-muted">{error}</p>}
      {!sentences && !error && <p className="my-auto text-center text-sm text-muted">A IA monta frases com as palavras que você mais erra.</p>}
      <div className="divide-y divide-line">
        {sentences?.map((s, i) => (
          <div key={i} className="flex items-start gap-3 py-4">
            <div className="flex-1 space-y-1">
              <div className="font-jp text-lg font-bold">{s.text}</div>
              {s.romanized && <div className="text-sm text-muted">{s.romanized}</div>}
              <Respelling text={s.respelling_pt} size="md" />
              <div className="text-sm text-muted">{s.pt}</div>
            </div>
            <PlayButton text={s.text} lang={lang} />
          </div>
        ))}
      </div>
    </Activity>
  );
}
