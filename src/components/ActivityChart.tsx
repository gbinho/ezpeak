'use client';
import { useEffect, useMemo, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { supabase } from '@/lib/supabase';

// Todas as atividades contam: cards (revisões) + leitura + música + prática + tutor.
const KINDS = [
  { id: 'cards', label: 'Cards', color: 'var(--s1)' },
  { id: 'reading', label: 'Leitura', color: 'var(--s2)' },
  { id: 'music', label: 'Música', color: 'var(--s3)' },
  { id: 'practice', label: 'Prática', color: 'var(--s4)' },
  { id: 'tutor', label: 'Tutor', color: 'var(--s5)' },
] as const;
type Kind = (typeof KINDS)[number]['id'];
type Day = { date: Date; key: string; min: Record<Kind, number>; total: number };

const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const zero = (): Record<Kind, number> => ({ cards: 0, reading: 0, music: 0, practice: 0, tutor: 0 });
const fmt = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, '0')}` : `${Math.round(m)} min`);

function useMonthActivity() {
  const { decks, global } = useApp();
  const [days, setDays] = useState<Day[] | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      // Começa na segunda anterior para a semana atual nunca ficar cortada.
      const from = new Date(Math.min(+start, +now - ((now.getDay() + 6) % 7) * 86400000));
      from.setHours(0, 0, 0, 0);
      const ids = decks.filter((d) => d.language === global.language).map((d) => d.id);
      const [{ data: items }, { data: logs }, { data: acts }] = await Promise.all([
        supabase.from('items').select('id').in('deck_id', ids),
        supabase.from('review_logs').select('created_at,elapsed_ms,item_id').gte('created_at', from.toISOString()).limit(10000),
        supabase.from('activity_logs').select('created_at,kind,seconds').eq('language', global.language).gte('created_at', from.toISOString()).limit(5000),
      ]);
      const mine = new Set((items ?? []).map((i) => i.id));
      const map = new Map<string, Day>();
      for (let d = new Date(from); d <= now; d.setDate(d.getDate() + 1)) map.set(key(d), { date: new Date(d), key: key(d), min: zero(), total: 0 });
      const add = (at: string, kind: Kind, min: number) => {
        const day = map.get(key(new Date(at)));
        if (!day) return;
        day.min[kind] += min;
        day.total += min;
      };
      for (const l of logs ?? []) if (mine.has(l.item_id)) add(l.created_at, 'cards', (l.elapsed_ms ?? 0) / 60000);
      for (const a of acts ?? []) add(a.created_at, a.kind as Kind, a.seconds / 60);
      setDays([...map.values()]);
    })();
  }, [decks, global.language]);
  return days;
}

/** Gráfico acumulado (empilhado por atividade) + calendário do mês. */
export default function ActivityChart() {
  const all = useMonthActivity();
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [hover, setHover] = useState<number | null>(null);

  const days = useMemo(() => {
    if (!all) return null;
    const now = new Date();
    if (range === 'month') return all.filter((d) => d.date.getMonth() === now.getMonth());
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return all.filter((d) => d.date >= monday);
  }, [all, range]);

  if (!days || !all) return <div className="card h-64 animate-pulse" />;

  // Acumulado por atividade, empilhado na ordem fixa.
  const cum = KINDS.map(() => 0);
  const stacks = days.map((d) => {
    KINDS.forEach((k, i) => (cum[i] += d.min[k.id]));
    let base = 0;
    return KINDS.map((_, i) => {
      const y0 = base;
      base += cum[i];
      return [y0, base] as [number, number];
    });
  });
  const totals = KINDS.map((_, i) => cum[i]);
  const grand = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(5, grand);

  // Geometria do SVG
  const W = 320;
  const H = 140;
  const span = range === 'week' ? 7 : new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const x = (i: number) => (span === 1 ? W / 2 : (i / (span - 1)) * W);
  const y = (v: number) => H - (v / max) * H;
  const area = (k: number) => {
    const top = stacks.map((s, i) => `${x(i)},${y(s[k][1])}`);
    const bottom = stacks.map((s, i) => `${x(i)},${y(s[k][0])}`).reverse();
    return `M${top.join('L')}L${bottom.join('L')}Z`;
  };
  const hi = hover ?? days.length - 1;
  const hd = days[hi];
  const hdCum = stacks[hi]?.[KINDS.length - 1][1] ?? 0;

  return (
    <section className="card space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{range === 'week' ? 'Esta semana' : 'Este mês'}</p>
          <p className="font-display text-3xl font-extrabold tabular-nums">{fmt(grand)}</p>
        </div>
        <div className="flex rounded-lg border border-line p-0.5 text-xs font-semibold" role="tablist">
          {(['week', 'month'] as const).map((r) => (
            <button key={r} role="tab" aria-selected={range === r} onClick={() => { setRange(r); setHover(null); }} className={`rounded-md px-2.5 py-1 ${range === r ? 'bg-surface-2 text-ink' : 'text-muted'}`}>
              {r === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      {/* gráfico acumulado: cresce ao longo do período */}
      <div className="relative">
        <svg viewBox={`0 -6 ${W} ${H + 12}`} className="w-full overflow-visible" role="img" aria-label={`Minutos acumulados: ${fmt(grand)}`}>
          {[0.5, 1].map((t) => (
            <line key={t} x1={0} x2={W} y1={y(max * t)} y2={y(max * t)} stroke="var(--line)" strokeWidth={1} strokeDasharray="2 4" />
          ))}
          <line x1={0} x2={W} y1={H} y2={H} stroke="var(--line)" />
          {grand > 0 && KINDS.map((k, i) => totals[i] > 0 && <path key={k.id} d={area(i)} fill={k.color} opacity={0.9} stroke="var(--surface)" strokeWidth={1.5} strokeLinejoin="round" />)}
          {grand > 0 && <path d={`M${stacks.map((s, i) => `${x(i)},${y(s[KINDS.length - 1][1])}`).join('L')}`} fill="none" stroke="var(--ink)" strokeWidth={2} strokeLinejoin="round" />}
          {/* hora atual */}
          <line x1={x(hi)} x2={x(hi)} y1={0} y2={H} stroke="var(--ink)" strokeOpacity={0.35} />
          <circle cx={x(hi)} cy={y(hdCum)} r={4} fill="var(--ink)" stroke="var(--surface)" strokeWidth={2} />
          {/* áreas de toque por dia */}
          {days.map((_, i) => (
            <rect
              key={i}
              x={x(i) - W / span / 2}
              y={-6}
              width={W / span}
              height={H + 12}
              fill="transparent"
              onPointerEnter={() => setHover(i)}
              onPointerDown={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-muted tabular-nums">
          <span>{days[0].date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
          <span>{range === 'week' ? 'domingo' : `dia ${span}`}</span>
        </div>
      </div>

      {/* detalhe do dia selecionado (toque/hover no gráfico) */}
      <div className="rounded-lg bg-surface-2 px-3 py-2 text-xs">
        <span className="font-semibold capitalize">{hd.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
        <span className="text-muted"> · {fmt(hd.total)} no dia · {fmt(hdCum)} acumulado</span>
      </div>

      {/* legenda com totais (identidade nunca só pela cor) */}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        {KINDS.map((k, i) => (
          <li key={k.id} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: k.color }} />
            <span className="flex-1 text-muted">{k.label}</span>
            <span className="font-semibold tabular-nums">{fmt(totals[i])}</span>
          </li>
        ))}
      </ul>

      <MonthHeatmap all={all} />
    </section>
  );
}

/** Calendário do mês: cada dia mais escuro quanto mais tempo estudado. */
function MonthHeatmap({ all }: { all: Day[] }) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // segunda = 0
  const byKey = new Map(all.map((d) => [d.key, d]));
  const max = Math.max(10, ...all.map((d) => d.total));
  const active = all.filter((d) => d.date.getMonth() === now.getMonth() && d.total >= 1).length;

  return (
    <div className="space-y-2 border-t border-line pt-4">
      <div className="flex justify-between text-sm">
        <span className="font-semibold capitalize">{now.toLocaleDateString('pt-BR', { month: 'long' })}</span>
        <span className="text-muted tabular-nums">{active} {active === 1 ? 'dia ativo' : 'dias ativos'}</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted">
        {'STQQSSD'.split('').map((d, i) => <span key={i}>{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(now.getFullYear(), now.getMonth(), i + 1);
          const d = byKey.get(key(date));
          const total = d?.total ?? 0;
          const future = date > now;
          const isToday = i + 1 === now.getDate();
          return (
            <span
              key={i}
              title={`${i + 1}: ${fmt(total)}`}
              className={`grid aspect-square place-items-center rounded-md tabular-nums ${isToday ? 'ring-2 ring-ink/40' : ''} ${total >= 1 && total / max > 0.45 ? 'text-accent-ink' : ''}`}
              style={{
                background: future ? 'transparent' : total >= 1 ? `color-mix(in srgb, var(--accent) ${Math.round(25 + (total / max) * 75)}%, var(--surface-2))` : 'var(--surface-2)',
                border: future ? '1px dashed var(--line)' : undefined,
              }}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}
