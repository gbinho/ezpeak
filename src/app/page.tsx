'use client';
import { ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import DeckIcon from '@/components/DeckIcon';
import LanguagePicker from '@/components/LanguagePicker';
import { useApp } from '@/lib/app-context';
import { buildQueue, startOfToday } from '@/lib/queue';
import { isDeckAdded } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import type { Deck } from '@/lib/types';

type Stat = { seen: number; total: number };

const dayKey = (d: Date) => {
  const x = new Date(d.getTime() - 4 * 3600000);
  return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
};

export default function Home() {
  const { decks, global, saveGlobal, settingsFor } = useApp();
  const [counts, setCounts] = useState<{ due: number; fresh: number } | null>(null);
  const [byDay, setByDay] = useState<Map<string, number>>(new Map());
  const [deckStats, setDeckStats] = useState<Record<string, Stat>>({});

  const langDecks = decks.filter((d) => d.language === global.language);
  const added = langDecks.filter((d) => isDeckAdded(global, d.id));
  const addedKey = added.map((d) => d.id).join();

  useEffect(() => {
    if (!added.length) return setCounts({ due: 0, fresh: 0 });
    setCounts(null);
    buildQueue({ decks: added, settingsFor, session: { ...settingsFor(), sessionMode: 'time' } }).then((r) => setCounts(r.counts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addedKey]);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 400 * 86400000).toISOString();
      const [{ data: logs }, { data: items }, { data: ucs }] = await Promise.all([
        supabase.from('review_logs').select('created_at').gte('created_at', since).limit(5000),
        supabase.from('items').select('id,deck_id'),
        supabase.from('user_cards').select('item_id'),
      ]);
      const m = new Map<string, number>();
      for (const l of logs ?? []) {
        const k = dayKey(new Date(l.created_at));
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      setByDay(m);
      const seen = new Set((ucs ?? []).map((u) => u.item_id));
      const st: Record<string, Stat> = {};
      for (const i of items ?? []) {
        st[i.deck_id] ??= { seen: 0, total: 0 };
        st[i.deck_id].total++;
        if (seen.has(i.id)) st[i.deck_id].seen++;
      }
      setDeckStats(st);
    })();
  }, []);

  if (!global.languages.length) return <LanguagePicker />;

  // Sequência de dias
  let streak = 0;
  const d = startOfToday();
  if (!byDay.has(dayKey(d))) d.setDate(d.getDate() - 1);
  while (byDay.has(dayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }

  const done = (deck: Deck) => {
    const s = deckStats[deck.id];
    return !!s && s.total > 0 && s.seen >= s.total;
  };
  const studying = added.filter((x) => !done(x));
  const completed = added.filter(done);
  const userRank = ['intermediate', 'advanced'].includes(global.levels[global.language] ?? '') ? 2 : 1;
  const isChallenge = (deck: Deck) => (deck.level === 'A2' ? 2 : 1) > userRank;
  const next = langDecks.filter((x) => !isDeckAdded(global, x.id)).sort((a, b) => Number(isChallenge(a)) - Number(isChallenge(b)) || a.sort_order - b.sort_order);

  const addDeck = (deck: Deck) => saveGlobal({ addedDecks: [...added.map((x) => x.id), ...(global.addedDecks ?? []).filter((id) => !langDecks.some((x) => x.id === id)), deck.id] });
  const pending = counts ? counts.due + counts.fresh : null;

  return (
    <div className="space-y-7">
      <section className="card overflow-hidden">
        <div className="bg-accent p-5 text-accent-ink">
          <p className="text-sm font-semibold opacity-90">Hoje</p>
          <p className="font-display text-4xl font-extrabold">{pending === null ? '…' : pending === 0 ? 'Tudo em dia' : `${pending} cards`}</p>
          {counts && pending! > 0 && <p className="text-sm opacity-90">{counts.due} para revisar · {counts.fresh} novos</p>}
          <Link href="/study" className="btn mt-4 w-full bg-accent-ink text-accent">{pending ? 'Começar sessão' : 'Revisão extra'}</Link>
        </div>
        <Week byDay={byDay} streak={streak} />
      </section>

      <Section title="Estudando" action={<Link href="/create" className="flex items-center gap-1 text-sm font-semibold text-accent"><Plus className="h-4 w-4" />Card</Link>}>
        {studying.length ? studying.map((x) => <DeckRow key={x.id} deck={x} stat={deckStats[x.id]} right={<Link href={`/study?deck=${x.id}`} className="text-sm font-semibold text-accent">Estudar</Link>} />) : <p className="px-4 py-5 text-sm text-muted">Adicione um deck abaixo para começar.</p>}
      </Section>

      {next.length > 0 && (
        <Section title="Próximos para aprender">
          {next.slice(0, 4).map((x) => (
            <DeckRow key={x.id} deck={x} badge={isChallenge(x) ? 'Desafio' : undefined} right={<button onClick={() => addDeck(x)} className="rounded-full bg-accent-soft px-3 py-1.5 text-sm font-semibold text-accent">Adicionar</button>} />
          ))}
        </Section>
      )}

      {completed.length > 0 && (
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-muted">
            Concluídos ({completed.length})
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
          </summary>
          <div className="card mt-2 divide-y divide-line overflow-hidden">
            {completed.map((x) => <DeckRow key={x.id} deck={x} stat={deckStats[x.id]} />)}
          </div>
        </details>
      )}
    </div>
  );
}

/** Semana atual, de segunda a domingo: um ponto por dia. */
function Week({ byDay, streak }: { byDay: Map<string, number>; streak: number }) {
  const today = startOfToday();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return { n: byDay.get(dayKey(x)) ?? 0, isToday: dayKey(x) === dayKey(today), future: x > today };
  });
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex flex-1 justify-between">
        {days.map((x, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <span
              className={`h-3 w-3 rounded-[4px] ${x.isToday ? 'ring-2 ring-accent/40 ring-offset-1 ring-offset-surface' : ''}`}
              style={{ background: x.n ? `color-mix(in srgb, var(--accent) ${Math.min(100, 35 + x.n * 3)}%, var(--surface-2))` : x.future ? 'transparent' : 'var(--surface-2)', border: x.future ? '1px dashed var(--line)' : undefined }}
              title={`${x.n} revisões`}
            />
            <span className={`text-[10px] ${x.isToday ? 'font-bold text-ink' : 'text-muted'}`}>{'STQQSSD'[i]}</span>
          </div>
        ))}
      </div>
      <span className="text-xs font-semibold text-muted tabular-nums">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">{title}</h2>
        {action}
      </div>
      <div className="card divide-y divide-line overflow-hidden">{children}</div>
    </section>
  );
}

function DeckRow({ deck, stat, right, badge }: { deck: Deck; stat?: Stat; right?: React.ReactNode; badge?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Link href={`/decks/${deck.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <DeckIcon deck={deck} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-semibold">{deck.title}</span>
            {badge && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn">{badge}</span>}
          </span>
          {stat ? (
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-surface-2">
              <span className="block h-full rounded-full bg-accent" style={{ width: `${(stat.seen / Math.max(1, stat.total)) * 100}%` }} />
            </span>
          ) : (
            <span className="block truncate text-sm text-muted">{deck.description}</span>
          )}
        </span>
      </Link>
      {right}
    </div>
  );
}
