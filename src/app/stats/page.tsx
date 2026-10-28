'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { supabase } from '@/lib/supabase';
import type { Item, UserCard } from '@/lib/types';

type Log = { created_at: string; rating: number; state: number; elapsed_ms: number | null };

export default function StatsPage() {
  const { decks, global } = useApp();
  const lang = global.language;
  const [logs, setLogs] = useState<Log[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [items, setItems] = useState<Map<string, Item>>(new Map());
  const [pron, setPron] = useState<{ score: number; created_at: string }[]>([]);

  useEffect(() => {
    const ids = decks.filter((d) => d.language === lang).map((d) => d.id);
    if (!ids.length) return;
    (async () => {
      const since = new Date(Date.now() - 84 * 86400000).toISOString();
      const [{ data: uc }, { data: it }, { data: lg }, { data: pa }] = await Promise.all([
        supabase.from('user_cards').select('*').in('deck_id', ids),
        supabase.from('items').select('*').in('deck_id', ids),
        supabase.from('review_logs').select('created_at,rating,state,elapsed_ms,item_id').gte('created_at', since).limit(10000),
        supabase.from('pronunciation_attempts').select('score,created_at').order('created_at').limit(500),
      ]);
      const itemMap = new Map(((it as Item[]) ?? []).map((i) => [i.id, i]));
      setItems(itemMap);
      setCards((uc as UserCard[]) ?? []);
      setLogs(((lg ?? []) as (Log & { item_id: string })[]).filter((l) => itemMap.has(l.item_id)));
      setPron(pa ?? []);
    })();
  }, [decks, lang]);

  // Heatmap: últimas 12 semanas
  const byDay = new Map<string, number>();
  for (const l of logs) {
    const k = l.created_at.slice(0, 10);
    byDay.set(k, (byDay.get(k) ?? 0) + 1);
  }
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(Date.now() - (83 - i) * 86400000);
    const k = d.toISOString().slice(0, 10);
    return { k, n: byDay.get(k) ?? 0 };
  });
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  // Retenção real (só cards em revisão)
  const reviewLogs = logs.filter((l) => l.state === 2);
  const retention = reviewLogs.length ? reviewLogs.filter((l) => l.rating > 1).length / reviewLogs.length : null;

  // Previsão: próximos 14 dias
  const forecast = Array.from({ length: 14 }, (_, i) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + i);
    const end = new Date(start.getTime() + 86400000);
    return cards.filter((c) => !c.suspended && (i === 0 ? new Date(c.due) < end : new Date(c.due) >= start && new Date(c.due) < end)).length;
  });
  const maxF = Math.max(1, ...forecast);

  const mature = cards.filter((c) => c.scheduled_days >= 21).length;
  const learning = cards.filter((c) => c.state === 1 || c.state === 3).length;
  const young = cards.length - mature - learning;
  const leeches = [...cards].filter((c) => c.lapses >= 3).sort((a, b) => b.lapses - a.lapses).slice(0, 8);
  const minutes = Math.round(logs.reduce((a, l) => a + (l.elapsed_ms ?? 0), 0) / 60000);
  const pronAvg = pron.length ? Math.round(pron.slice(-30).reduce((a, p) => a + p.score, 0) / Math.min(30, pron.length)) : null;
  const pronFirst = pron.length >= 10 ? Math.round(pron.slice(0, 10).reduce((a, p) => a + p.score, 0) / 10) : null;

  const known = new Set(cards.filter((c) => c.scheduled_days >= 7).map((c) => c.item_id)).size;
  const level = lang === 'en'
    ? known >= 600 ? 'A2' : known >= 150 ? 'A1' : 'Pré-A1'
    : known >= 600 ? 'N5 completo' : known >= 150 ? 'N5 em andamento' : 'Iniciante';

  return (
    <div className="space-y-5">
      <h1 className="font-display text-3xl font-extrabold">Progresso</h1>

      <Link href="/study?extra=starred" className="card flex items-center justify-between px-4 py-4 font-semibold">
        Revisar cards marcados
        <span className="text-sm font-normal text-muted">não altera o agendamento</span>
      </Link>

      <div className="grid grid-cols-2 gap-3">
        <Tile n={known} l="palavras que você sabe" />
        <Tile n={level} l="nível estimado" />
        <Tile n={retention === null ? '—' : `${Math.round(retention * 100)}%`} l={`retenção real (meta ${Math.round(global.retention * 100)}%)`} />
        <Tile n={`${minutes} min`} l="estudados em 12 semanas" />
      </div>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Atividade (12 semanas)</h2>
        <div className="grid grid-flow-col grid-rows-7 gap-1">
          {days.map((d) => (
            <div key={d.k} title={`${d.k}: ${d.n} revisões`} className="aspect-square rounded-sm" style={{ background: d.n ? `color-mix(in srgb, var(--accent) ${20 + (d.n / maxDay) * 80}%, var(--surface-2))` : 'var(--surface-2)' }} />
          ))}
        </div>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Revisões previstas (14 dias)</h2>
        <div className="flex h-28 items-end gap-1">
          {forecast.map((n, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted">{n || ''}</span>
              <div className="w-full rounded-t bg-accent" style={{ height: `${(n / maxF) * 80}px`, minHeight: n ? 3 : 0 }} />
              <span className="text-[10px] text-muted">{i === 0 ? 'hoje' : i}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Seus cards</h2>
        <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="bg-warn" style={{ width: `${(learning / Math.max(1, cards.length)) * 100}%` }} />
          <div className="bg-blue" style={{ width: `${(young / Math.max(1, cards.length)) * 100}%` }} />
          <div className="bg-good" style={{ width: `${(mature / Math.max(1, cards.length)) * 100}%` }} />
        </div>
        <div className="flex gap-4 text-sm text-muted">
          <span><b className="text-warn">●</b> Aprendendo {learning}</span>
          <span><b className="text-blue">●</b> Jovens {young}</span>
          <span><b className="text-good">●</b> Maduros {mature}</span>
        </div>
      </section>

      {pronAvg !== null && (
        <section className="card p-4">
          <h2 className="font-semibold">Pronúncia</h2>
          <p className="text-muted">
            Média recente <b className="font-display text-2xl text-ink">{pronAvg}</b>
            {pronFirst !== null && <> · começou em {pronFirst} ({pronAvg - pronFirst >= 0 ? '+' : ''}{pronAvg - pronFirst})</>}
          </p>
        </section>
      )}

      {leeches.length > 0 && (
        <section className="card space-y-2 p-4">
          <h2 className="font-semibold">Cards mais difíceis</h2>
          {leeches.map((c) => {
            const it = items.get(c.item_id);
            return it ? (
              <Link key={`${c.item_id}${c.card_type}`} href={`/decks/${c.deck_id}`} className="flex justify-between text-sm">
                <span className="font-jp font-semibold">{it.text_original} <span className="font-sans font-normal text-muted">· {it.translation_pt}</span></span>
                <span className="text-bad">{c.lapses} erros</span>
              </Link>
            ) : null;
          })}
        </section>
      )}
    </div>
  );
}

function Tile({ n, l }: { n: string | number; l: string }) {
  return (
    <div className="card p-4">
      <div className="font-display text-2xl font-extrabold">{n}</div>
      <div className="text-xs text-muted">{l}</div>
    </div>
  );
}
