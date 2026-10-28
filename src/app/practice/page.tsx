'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AudioBar, PlayButton } from '@/components/Audio';
import PronunciationCheck from '@/components/PronunciationCheck';
import Respelling from '@/components/Respelling';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { similarity, speak } from '@/lib/speech';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/types';

type Mode = 'build' | 'dictation' | 'pairs' | 'speak' | 'weak';

const MODES: { id: Mode; icon: string; title: string; desc: string }[] = [
  { id: 'build', icon: '🧩', title: 'Montar a frase', desc: 'Ordene os blocos pela tradução' },
  { id: 'dictation', icon: '🎧', title: 'Ditado', desc: 'Ouça e escreva' },
  { id: 'pairs', icon: '👂', title: 'Pares mínimos', desc: 'Qual das duas você ouviu?' },
  { id: 'speak', icon: '🎤', title: 'Treino de pronúncia', desc: 'Fale e receba uma nota' },
  { id: 'weak', icon: '✨', title: 'Frases dos seus erros', desc: 'IA cria frases com o que você mais erra' },
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
        <p className="text-muted">Exercícios livres. Não mexem no agendamento dos seus flashcards.</p>
        <div className="grid grid-cols-2 gap-3">
          {MODES.map((m) => (
            <button key={m.id} onClick={() => setMode(m.id)} className="card p-4 text-left">
              <div className="text-3xl">{m.icon}</div>
              <div className="mt-1 font-semibold">{m.title}</div>
              <div className="hint">{m.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );

  const back = <button className="text-sm text-muted" onClick={() => setMode(null)}>← Exercícios</button>;
  const pronDeck = decks.find((d) => d.language === lang && d.theme === 'pronuncia');

  return (
    <div className="space-y-4">
      {back}
      {mode === 'build' && <Build items={items.filter((i) => (lang === 'en' ? i.text_original.includes(' ') || i.example : i.text_romanized?.includes(' ')))} lang={lang} />}
      {mode === 'dictation' && <Dictation items={items} lang={lang} rate={global.audioRate} />}
      {mode === 'pairs' && <Pairs items={items.filter((i) => i.deck_id === pronDeck?.id)} lang={lang} />}
      {mode === 'speak' && <Speak items={items} lang={lang} rate={global.audioRate} />}
      {mode === 'weak' && <Weak lang={lang} />}
    </div>
  );
}

// ---------- Montar a frase ----------
function Build({ items, lang }: { items: Item[]; lang: 'en' | 'ja' }) {
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
  if (!q) return <p className="text-muted">Carregando…</p>;

  const answer = chosen.map((i) => q.words[i]).join(' ');
  const next = () => { setQ(pick()); setChosen([]); setChecked(null); };

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Monte a frase</h2>
      <p className="text-2xl font-semibold">{q.pt}</p>
      <div className="card min-h-16 flex flex-wrap gap-2 p-3">
        {chosen.map((i, k) => (
          <button key={k} className="rounded-lg bg-accent px-3 py-1.5 font-semibold text-accent-ink" onClick={() => checked === null && setChosen(chosen.filter((_, j) => j !== k))}>{q.words[i]}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {q.words.map((w, i) => (
          <button key={i} disabled={chosen.includes(i)} onClick={() => setChosen([...chosen, i])} className="rounded-lg border border-line bg-surface px-3 py-1.5 font-semibold disabled:opacity-25">{w}</button>
        ))}
      </div>
      {checked === null ? (
        <button className="btn-primary w-full" disabled={chosen.length !== q.words.length} onClick={() => { setChecked(answer === q.target); speak(lang === 'en' ? q.target : q.it.text_original, lang); }}>Verificar</button>
      ) : (
        <div className={`space-y-2 rounded-xl p-4 ${checked ? 'bg-good-soft' : 'bg-bad-soft'}`}>
          <p className="font-bold">{checked ? '✓ Certo!' : `Resposta: ${q.target}`}</p>
          {lang === 'ja' && <p className="font-jp text-xl">{q.it.text_original}</p>}
          {(lang === 'ja' || !q.it.example) && <Respelling text={q.it.respelling_pt} size="md" />}
          <button className="btn-primary w-full" onClick={next}>Próxima</button>
        </div>
      )}
    </div>
  );
}

// ---------- Ditado ----------
function Dictation({ items, lang, rate }: { items: Item[]; lang: 'en' | 'ja'; rate: number }) {
  const pick = useCallback(() => items[Math.floor(Math.random() * items.length)] ?? null, [items]);
  const [it, setIt] = useState<Item | null>(pick);
  const [typed, setTyped] = useState('');
  const [result, setResult] = useState<number | null>(null);
  useEffect(() => setIt(pick()), [pick]);
  useEffect(() => { if (it) speak(it.text_original, lang, rate); }, [it, lang, rate]);
  if (!it) return <p className="text-muted">Carregando…</p>;
  const check = () => setResult(Math.max(similarity(typed, it.text_original), it.text_romanized ? similarity(typed, it.text_romanized) : 0));
  return (
    <div className="space-y-4 text-center">
      <h2 className="font-display text-xl font-bold">Escreva o que ouviu</h2>
      <div className="flex justify-center"><PlayButton big text={it.text_original} lang={lang} rate={rate} /></div>
      <button className="chip" onClick={() => speak(it.text_original, lang, 0.55)}>🐢 Lento</button>
      <form onSubmit={(e) => { e.preventDefault(); check(); }} className="flex gap-2">
        <input className="field" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={lang === 'ja' ? 'kana ou romaji' : 'digite aqui'} />
        <button className="btn-primary">OK</button>
      </form>
      {result !== null && (
        <div className={`space-y-2 rounded-xl p-4 ${result >= 0.9 ? 'bg-good-soft' : result >= 0.7 ? 'bg-warn-soft' : 'bg-bad-soft'}`}>
          <p className="font-bold">{result >= 0.9 ? '✓ Perfeito' : result >= 0.7 ? 'Quase!' : 'Não foi dessa vez'}</p>
          <p className="font-jp text-2xl font-bold">{it.text_original}</p>
          {it.text_romanized && <p className="text-muted">{it.text_romanized}</p>}
          <Respelling text={it.respelling_pt} />
          <p>{it.translation_pt}</p>
          <button className="btn-primary w-full" onClick={() => { setIt(pick()); setTyped(''); setResult(null); }}>Próxima</button>
        </div>
      )}
    </div>
  );
}

// ---------- Pares mínimos ----------
function Pairs({ items, lang }: { items: Item[]; lang: 'en' | 'ja' }) {
  const pairs = useMemo(() => {
    const out: [Item, Item][] = [];
    for (let i = 0; i + 1 < items.length; i += 2) out.push([items[i], items[i + 1]]);
    return out;
  }, [items]);
  const pick = useCallback(() => {
    const p = pairs[Math.floor(Math.random() * pairs.length)];
    return p ? { pair: shuffle(p), target: p[Math.round(Math.random())] } : null;
  }, [pairs]);
  const [q, setQ] = useState(pick);
  const [answer, setAnswer] = useState<Item | null>(null);
  const [score, setScore] = useState({ ok: 0, total: 0 });
  useEffect(() => setQ(pick()), [pick]);
  useEffect(() => { if (q) speak(q.target.text_original, lang); }, [q, lang]);
  if (!q) return <p className="text-muted">Carregando…</p>;

  return (
    <div className="space-y-4 text-center">
      <h2 className="font-display text-xl font-bold">Qual você ouviu?</h2>
      <p className="text-sm text-muted">Acertos: {score.ok}/{score.total}</p>
      <div className="flex justify-center"><PlayButton big text={q.target.text_original} lang={lang} /></div>
      <div className="grid grid-cols-2 gap-3">
        {q.pair.map((it) => {
          const state = answer ? (it.id === q.target.id ? 'bg-good-soft border-good' : it.id === answer.id ? 'bg-bad-soft border-bad' : '') : '';
          return (
            <button key={it.id} disabled={!!answer} onClick={() => { setAnswer(it); setScore((s) => ({ ok: s.ok + (it.id === q.target.id ? 1 : 0), total: s.total + 1 })); }} className={`card space-y-1 p-4 ${state}`}>
              <div className="font-jp text-2xl font-bold">{it.text_original}</div>
              <Respelling text={it.respelling_pt} size="md" />
              <div className="text-sm text-muted">{it.translation_pt}</div>
            </button>
          );
        })}
      </div>
      {answer && (
        <>
          <p className="rounded-xl bg-blue-soft p-3 text-sm">💡 {q.target.tip_pt}</p>
          <div className="flex gap-2">
            {q.pair.map((it) => <button key={it.id} className="btn-ghost flex-1" onClick={() => speak(it.text_original, lang)}>▶ {it.text_original}</button>)}
          </div>
          <button className="btn-primary w-full" onClick={() => { setQ(pick()); setAnswer(null); }}>Próximo</button>
        </>
      )}
    </div>
  );
}

// ---------- Treino de pronúncia ----------
function Speak({ items, lang, rate }: { items: Item[]; lang: 'en' | 'ja'; rate: number }) {
  const [i, setI] = useState(0);
  const it = items[i % Math.max(1, items.length)];
  if (!it) return <p className="text-muted">Carregando…</p>;
  return (
    <div className="space-y-4 text-center">
      <h2 className="font-display text-xl font-bold">Fale em voz alta</h2>
      <div className="card space-y-3 p-5">
        <div className="font-jp text-4xl font-bold">{it.text_original}</div>
        {it.text_romanized && <div className="text-muted">{it.text_romanized}</div>}
        <Respelling text={it.respelling_pt} size="xl" />
        <div className="text-muted">{it.translation_pt}</div>
        <AudioBar item={it} lang={lang} rate={rate} />
      </div>
      <PronunciationCheck key={it.id} item={it} lang={lang} />
      <div className="flex gap-2">
        <button className="btn-ghost flex-1" onClick={() => setI((x) => Math.max(0, x - 1))}>← Anterior</button>
        <button className="btn-ghost flex-1" onClick={() => setI(Math.floor(Math.random() * items.length))}>🎲 Aleatória</button>
        <button className="btn-primary flex-1" onClick={() => setI((x) => x + 1)}>Próxima →</button>
      </div>
    </div>
  );
}

// ---------- Frases com seus pontos fracos (IA) ----------
type Sentence = { text: string; romanized: string | null; pt: string; respelling_pt: string };

function Weak({ lang }: { lang: 'en' | 'ja' }) {
  const { decks } = useApp();
  const [sentences, setSentences] = useState<Sentence[] | null>(null);
  const [weak, setWeak] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setError(null);
    const ids = decks.filter((d) => d.language === lang).map((d) => d.id);
    const { data: ucs } = await supabase.from('user_cards').select('item_id,lapses,difficulty').in('deck_id', ids).order('lapses', { ascending: false }).order('difficulty', { ascending: false }).limit(10);
    const itemIds = [...new Set((ucs ?? []).map((u) => u.item_id))];
    if (!itemIds.length) {
      setError('Estude alguns flashcards primeiro: as frases são montadas a partir dos cards que você mais erra.');
      setBusy(false);
      return;
    }
    const { data: its } = await supabase.from('items').select('*').in('id', itemIds);
    setWeak((its as Item[]) ?? []);
    try {
      const r = await callAI<{ sentences: Sentence[] }>('sentences', { items: its, language: lang });
      setSentences(r.sentences);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Frases com o que você mais erra</h2>
      <button className="btn-primary w-full" onClick={run} disabled={busy}>{busy ? 'Gerando…' : sentences ? '✨ Gerar outras' : '✨ Gerar frases'}</button>
      {error && <p className="rounded-xl bg-warn-soft p-3 text-sm">{error}</p>}
      {weak.length > 0 && <div className="flex flex-wrap gap-1.5">{weak.map((w) => <span key={w.id} className="chip">{w.text_original}</span>)}</div>}
      {sentences?.map((s, i) => (
        <div key={i} className="card space-y-1 p-4">
          <div className="flex items-start gap-2">
            <div className="flex-1 font-jp text-lg font-bold">{s.text}</div>
            <PlayButton text={s.text} lang={lang} />
          </div>
          {s.romanized && <div className="text-sm text-muted">{s.romanized}</div>}
          <Respelling text={s.respelling_pt} size="md" />
          <div className="text-sm text-muted">{s.pt}</div>
        </div>
      ))}
    </div>
  );
}
