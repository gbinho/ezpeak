'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { buildQueue, startOfToday } from '@/lib/queue';
import LanguagePicker from '@/components/LanguagePicker';
import { supabase } from '@/lib/supabase';
import type { Deck } from '@/lib/types';

export default function Home() {
  const { decks, global, saveGlobal, settingsFor } = useApp();
  const [counts, setCounts] = useState<{ due: number; fresh: number } | null>(null);
  const [today, setToday] = useState({ minutes: 0, cards: 0, streak: 0 });
  const [deckStats, setDeckStats] = useState<Record<string, { seen: number; total: number }>>({});

  const langDecks = decks.filter((d) => d.language === global.language);
  const active = langDecks.filter((d) => !global.disabledDecks.includes(d.id));

  useEffect(() => {
    if (!langDecks.length) return;
    setCounts(null);
    const s = settingsFor();
    buildQueue({ decks: active, settingsFor, session: { ...s, sessionMode: 'time' } }).then((r) => setCounts(r.counts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [global.language, global.disabledDecks.join(), decks.length]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 400 * 86400000).toISOString();
      const { data: logs } = await supabase.from('review_logs').select('created_at,elapsed_ms').gte('created_at', since).order('created_at', { ascending: false }).limit(5000);
      const t0 = startOfToday().getTime();
      const todayLogs = (logs ?? []).filter((l) => new Date(l.created_at).getTime() >= t0);
      const days = new Set((logs ?? []).map((l) => dayKey(new Date(l.created_at))));
      let streak = 0;
      const d = new Date(t0);
      if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // hoje ainda não estudou: não quebra a sequência
      while (days.has(dayKey(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
      setToday({ minutes: Math.round(todayLogs.reduce((a, l) => a + (l.elapsed_ms ?? 0), 0) / 60000), cards: todayLogs.length, streak });

      const { data: items } = await supabase.from('items').select('id,deck_id');
      const { data: ucs } = await supabase.from('user_cards').select('item_id,deck_id');
      const seen = new Set((ucs ?? []).map((u) => u.item_id));
      const st: Record<string, { seen: number; total: number }> = {};
      for (const i of items ?? []) {
        st[i.deck_id] ??= { seen: 0, total: 0 };
        st[i.deck_id].total++;
        if (seen.has(i.id)) st[i.deck_id].seen++;
      }
      setDeckStats(st);
    })();
  }, []);

  if (!global.languages.length) return <LanguagePicker />;

  const goal = global.dailyGoalMinutes;
  const pending = counts ? counts.due + counts.fresh : null;

  const toggle = (d: Deck) =>
    saveGlobal({ disabledDecks: global.disabledDecks.includes(d.id) ? global.disabledDecks.filter((x) => x !== d.id) : [...global.disabledDecks, d.id] });

  return (
    <div className="space-y-6">
      <section className="card overflow-hidden">
        <div className="bg-accent p-5 text-accent-ink">
          <p className="text-sm font-semibold opacity-90">Hoje</p>
          <p className="font-display text-4xl font-extrabold">{pending === null ? '…' : pending === 0 ? 'Tudo em dia!' : `${pending} cards`}</p>
          {counts && <p className="text-sm opacity-90">{counts.due} para revisar · {counts.fresh} novos</p>}
          <Link href="/study" className="btn mt-4 w-full bg-accent-ink text-accent">{pending ? 'Começar sessão' : 'Revisão extra'}</Link>
        </div>
        <div className="grid grid-cols-3 divide-x divide-line text-center">
          <Mini n={`🔥 ${today.streak}`} l="dias seguidos" />
          <Mini n={today.cards} l="cards hoje" />
          <div className="p-3">
            <div className="font-display text-xl font-extrabold">{today.minutes}/{goal} min</div>
            <div className="mx-auto mt-1 h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-good" style={{ width: `${Math.min(100, (today.minutes / goal) * 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/create" className="card p-4">
          <div className="text-2xl">✨</div>
          <div className="font-semibold">Criar card com IA</div>
          <div className="hint">Digite qualquer palavra</div>
        </Link>
        <Link href="/study?extra=starred" className="card p-4">
          <div className="text-2xl">★</div>
          <div className="font-semibold">Revisar marcados</div>
          <div className="hint">Não afeta o agendamento</div>
        </Link>
      </div>

      <DeckSection title="🧳 Modo sobrevivência" decks={langDecks.filter((d) => d.is_survival)} stats={deckStats} disabled={global.disabledDecks} onToggle={toggle} />
      <DeckSection title="Decks" decks={langDecks.filter((d) => !d.is_survival)} stats={deckStats} disabled={global.disabledDecks} onToggle={toggle} />
    </div>
  );
}

const dayKey = (d: Date) => {
  const x = new Date(d.getTime() - 4 * 3600000);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

function Mini({ n, l }: { n: string | number; l: string }) {
  return (
    <div className="p-3">
      <div className="font-display text-xl font-extrabold">{n}</div>
      <div className="text-xs text-muted">{l}</div>
    </div>
  );
}

function DeckSection({ title, decks, stats, disabled, onToggle }: { title: string; decks: Deck[]; stats: Record<string, { seen: number; total: number }>; disabled: string[]; onToggle: (d: Deck) => void }) {
  if (!decks.length) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      {decks.map((d) => {
        const st = stats[d.id];
        const off = disabled.includes(d.id);
        return (
          <div key={d.id} className={`card flex items-center gap-3 p-3 ${off ? 'opacity-55' : ''}`}>
            <Link href={`/decks/${d.id}`} className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold">{d.title}</span>
                {d.level && <span className="chip">{d.level}</span>}
                {d.owner_id && <span className="chip">Meu</span>}
              </div>
              <div className="truncate text-sm text-muted">{d.description}</div>
              {st && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full bg-accent" style={{ width: `${(st.seen / st.total) * 100}%` }} />
                </div>
              )}
            </Link>
            <div className="flex flex-col items-end gap-1">
              <Link href={`/study?deck=${d.id}`} className="chip bg-accent-soft text-accent">Estudar</Link>
              <button onClick={() => onToggle(d)} className="text-xs text-muted">{off ? 'Ativar' : 'Pausar'}</button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
