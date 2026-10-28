'use client';
import { useEffect, useRef, useState } from 'react';
import Activity from '@/components/Activity';
import { PlayButton } from '@/components/Audio';
import Respelling from '@/components/Respelling';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { LANG_LABEL } from '@/lib/settings';
import { useTrack } from '@/lib/track';
import type { Lang } from '@/lib/types';
import { canRecognize, recognize } from '@/lib/speech';
import { supabase } from '@/lib/supabase';

type TutorReply = {
  reply: string;
  reply_romanized: string | null;
  reply_respelling: string;
  reply_pt: string;
  corrections: { wrong: string; right: string; explain_pt: string }[];
  suggestion: string;
  blocks?: string[];
  distractors?: string[];
};
type Msg = { role: 'user'; content: string } | { role: 'assistant'; content: string; data: TutorReply };

const SCENARIOS = {
  en: ['Pedir comida num restaurante', 'Check-in no hotel', 'Imigração no aeroporto', 'Pedir informação na rua', 'Conversa com um colega novo'],
  ru: ['Pedir comida num café', 'Comprar bilhete de metrô', 'Se apresentar a alguém', 'Pedir informação na rua'],
  fr: ['Pedir num café em Paris', 'Check-in no hotel', 'Comprar pão na padaria', 'Pedir informação na rua'],
  ja: ['Pedir lámen num restaurante', 'Comprar bilhete de trem', 'Konbini (loja de conveniência)', 'Se apresentar a alguém', 'Pedir informação na estação'],
};

export default function TutorPage() {
  const { global, session } = useApp();
  const lang = global.language;
  const [scenario, setScenario] = useState<string | null>(null);
  useTrack(scenario ? 'tutor' : null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'write' | 'blocks'>('blocks');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: 'smooth' }), [msgs]);
  useEffect(() => { setScenario(null); setMsgs([]); }, [lang]);

  async function send(history: Msg[], sc = scenario) {
    setBusy(true);
    setError(null);
    try {
      const data = await callAI<TutorReply>('tutor', {
        language: lang,
        scenario: sc,
        messages: history.map((m) => ({ role: m.role, content: m.content })),
      });
      setMsgs([...history, { role: 'assistant', content: data.reply, data }]);
    } catch (e) {
      setError((e as Error).message);
    }
    setBusy(false);
  }

  function submit(text: string) {
    if (!text.trim()) return;
    const next: Msg[] = [...msgs, { role: 'user', content: text.trim() }];
    setMsgs(next);
    setInput('');
    send(next);
  }

  async function speakInput() {
    try {
      const { transcripts } = await recognize(lang).promise;
      if (transcripts[0]) setInput(transcripts[0]);
    } catch {
      setError('Não consegui ouvir. Permita o microfone.');
    }
  }

  /** Transforma as correções da conversa em cards no deck "Minhas palavras". */
  async function saveCorrections() {
    const corr = msgs.flatMap((m) => (m.role === 'assistant' ? m.data.corrections : []));
    if (!corr.length || !session) return;
    const { data: decks } = await supabase.from('decks').select('id').eq('owner_id', session.user.id).eq('language', lang).limit(1);
    let deckId = decks?.[0]?.id;
    if (!deckId) {
      const { data } = await supabase.from('decks').insert({ language: lang, title: 'Minhas palavras', theme: 'pessoal', description: 'Cards que você criou.', owner_id: session.user.id, sort_order: 99 }).select('id').single();
      deckId = data!.id;
    }
    const rows = await Promise.all(
      corr.map(async (c) => {
        const gen = await callAI<Record<string, string | null>>('generate', { word: c.right, language: lang }).catch(() => null);
        return gen && { ...gen, tip_pt: c.explain_pt, deck_id: deckId, owner_id: session.user.id, sort_order: Date.now() % 1e9 };
      }),
    );
    const valid = rows.filter(Boolean);
    await supabase.from('items').insert(valid);
    setSaved(valid.length);
  }

  if (!scenario)
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold">Tutor de conversa</h1>
        <p className="text-muted">Pratique uma situação real. O tutor responde em {LANG_LABEL[lang].toLowerCase()} com tradução e pronúncia literal, e corrige seus erros.</p>
        <div className="space-y-2">
          {SCENARIOS[lang].map((s) => (
            <button key={s} className="card w-full p-4 text-left font-semibold" onClick={() => { setScenario(s); send([], s); }}>{s}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const v = new FormData(e.currentTarget).get('custom') as string; if (v) { setScenario(v); send([], v); } }} className="flex gap-2">
          <input name="custom" className="field" placeholder="Ou descreva um cenário…" />
          <button className="btn-primary">Ir</button>
        </form>
      </div>
    );

  const corrections = msgs.flatMap((m) => (m.role === 'assistant' ? m.data.corrections : []));
  const last = [...msgs].reverse().find((m) => m.role === 'assistant') as Extract<Msg, { role: 'assistant' }> | undefined;

  const mic = (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );

  return (
    <Activity
      title={scenario}
      onBack={() => { setScenario(null); setMsgs([]); setSaved(0); }}
      footer={
        <>
          {corrections.length > 0 && (
            <button className="w-full text-sm font-semibold text-accent disabled:text-muted" disabled={saved > 0} onClick={saveCorrections}>
              {saved ? `${saved} cards criados em Minhas palavras` : `Salvar ${corrections.length} correções como cards`}
            </button>
          )}
          <div className="flex rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
            {(['blocks', 'write'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-lg py-1.5 ${mode === m ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
                {m === 'blocks' ? 'Blocos' : 'Escrever'}
              </button>
            ))}
          </div>
          {mode === 'blocks' ? (
            last && !busy ? <Blocks key={msgs.length} reply={last.data} lang={lang} onSend={submit} /> : <p className="py-3 text-center text-sm text-muted">{busy ? 'Aguardando o tutor…' : ''}</p>
          ) : (
            <>
              {last?.data.suggestion && !busy && (
                <button className="w-full truncate text-left text-sm text-muted" onClick={() => setInput(last.data.suggestion)}>
                  Sugestão: <span className="text-ink">{last.data.suggestion}</span>
                </button>
              )}
              <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className="flex gap-2">
                {canRecognize() && <button type="button" onClick={speakInput} className="btn-ghost shrink-0 px-3" aria-label="Falar">{mic}</button>}
                <input className="field" value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Responda em ${LANG_LABEL[lang].toLowerCase()}…`} />
                <button className="btn-primary shrink-0" disabled={busy || !input.trim()}>Enviar</button>
              </form>
            </>
          )}
        </>
      }
    >
      <div className="space-y-3 pt-2">
        {msgs.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-2.5 text-accent-ink">{m.content}</div>
          ) : (
            <div key={i} className="card max-w-[92%] space-y-1.5 rounded-bl-sm p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <div className="font-jp text-lg font-bold">{m.data.reply}</div>
                  {m.data.reply_romanized && <div className="text-sm text-muted">{m.data.reply_romanized}</div>}
                </div>
                <PlayButton text={m.data.reply} lang={lang} rate={global.audioRate} />
              </div>
              <Respelling text={m.data.reply_respelling} size="md" />
              <div className="text-sm text-muted">{m.data.reply_pt}</div>
              {m.data.corrections.map((c, j) => (
                <div key={j} className="rounded-lg bg-warn-soft p-2 text-sm">
                  <s className="text-bad">{c.wrong}</s> → <b className="text-good">{c.right}</b>
                  <div className="text-muted">{c.explain_pt}</div>
                </div>
              ))}
            </div>
          ),
        )}
        {busy && <div className="text-sm text-muted">Digitando…</div>}
        {error && <p className="rounded-xl bg-bad-soft p-3 text-sm text-bad">{error}</p>}
        <div ref={bottom} />
      </div>
    </Activity>
  );
}

/** Monta a resposta tocando nos blocos sugeridos pelo tutor (com alguns blocos de distração). */
function Blocks({ reply, lang, onSend }: { reply: TutorReply; lang: Lang; onSend: (t: string) => void }) {
  const [bank] = useState(() => {
    const blocks = reply.blocks?.length ? reply.blocks : reply.suggestion.split(' ');
    return [...blocks, ...(reply.distractors ?? [])].sort(() => Math.random() - 0.5);
  });
  const [chosen, setChosen] = useState<number[]>([]);
  const text = chosen.map((i) => bank[i]).join(lang === 'ja' ? '' : ' ');
  return (
    <div className="space-y-3">
      <div className="flex min-h-11 flex-wrap gap-1.5 border-b-2 border-line pb-2">
        {chosen.map((i, k) => (
          <button key={k} onClick={() => setChosen(chosen.filter((_, j) => j !== k))} className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-ink">{bank[i]}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {bank.map((w, i) => (
          <button key={i} disabled={chosen.includes(i)} onClick={() => setChosen([...chosen, i])} className="rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold transition disabled:opacity-20">{w}</button>
        ))}
      </div>
      <button className="btn-primary w-full" disabled={!chosen.length} onClick={() => onSend(text)}>Enviar</button>
    </div>
  );
}
