'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Grade } from 'ts-fsrs';
import Flashcard from '@/components/Flashcard';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { buildQueue, startOfToday, type Entry } from '@/lib/queue';
import { formatInterval, fsrsToRow, preview, Rating } from '@/lib/srs';
import { supabase } from '@/lib/supabase';
import type { UserCard } from '@/lib/types';

const GRADES: { r: Grade; label: string; cls: string; key: string }[] = [
  { r: Rating.Again as Grade, label: 'Errei', cls: 'bg-bad-soft text-bad', key: '1' },
  { r: Rating.Hard as Grade, label: 'Difícil', cls: 'bg-warn-soft text-warn', key: '2' },
  { r: Rating.Good as Grade, label: 'Bom', cls: 'bg-good-soft text-good', key: '3' },
  { r: Rating.Easy as Grade, label: 'Fácil', cls: 'bg-blue-soft text-blue', key: '4' },
];

export default function StudyPage() {
  return (
    <Suspense>
      <Study />
    </Suspense>
  );
}

function Study() {
  const params = useSearchParams();
  const deckId = params.get('deck');
  const extra = params.get('extra') as 'starred' | 'ahead' | null;
  const { decks, global, settingsFor, session, saveGlobal } = useApp();
  const [queue, setQueue] = useState<Entry[] | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [suggested, setSuggested] = useState<{ r: Grade; why: string } | null>(null);
  const [done, setDone] = useState({ total: 0, correct: 0 });
  const [menu, setMenu] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [leech, setLeech] = useState<Entry | null>(null);
  const [explain, setExplain] = useState<string | null>(null);
  // Errou/difícil antes de ver a resposta: mostra a resposta e espera "Continuar".
  const [pending, setPending] = useState<Grade | null>(null);
  const shownAt = useRef(Date.now());
  const startedAt = useRef(Date.now());
  const [elapsed, setElapsed] = useState(0);

  const sessionSettings = settingsFor(deckId ?? undefined);
  const activeDecks = useMemo(
    () => decks.filter((d) => (deckId ? d.id === deckId : d.language === global.language && !global.disabledDecks.includes(d.id))),
    [decks, deckId, global.language, global.disabledDecks],
  );

  useEffect(() => {
    if (!decks.length || queue) return;
    buildQueue({ decks: activeDecks, settingsFor, session: sessionSettings, extra }).then((r) => setQueue(r.entries));
  }, [decks.length, activeDecks, settingsFor, sessionSettings, extra, queue]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const current = queue?.[0];
  const s = current ? settingsFor(current.deck.id) : sessionSettings;
  const timeUp = sessionSettings.sessionMode === 'time' && elapsed >= sessionSettings.sessionMinutes * 60;
  const intervals = useMemo(() => (current ? preview(current.uc, s) : null), [current, s]);

  useEffect(() => {
    shownAt.current = Date.now();
    setRevealed(false);
    setPending(null);
    setSuggested(null);
    setExplain(null);
  }, [current?.item.id, current?.type]);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  /** Garante que exista a linha do card (cards novos ainda não existem no banco). */
  const upsertCard = useCallback(
    async (e: Entry, patch: Partial<UserCard>) => {
      const row = { user_id: session!.user.id, item_id: e.item.id, card_type: e.type, deck_id: e.deck.id, ...(e.uc ?? {}), ...patch };
      const { data } = await supabase.from('user_cards').upsert(row).select().single();
      return data as UserCard;
    },
    [session],
  );

  const replaceCurrent = (uc: UserCard | null, keep = true) =>
    setQueue((q) => (q ? (keep ? [{ ...q[0], uc }, ...q.slice(1)] : q.slice(1)) : q));

  const grade = useCallback(
    async (r: Grade) => {
      if (!current || !intervals) return;
      const next = intervals[r];
      const prevState = current.uc?.state ?? 0;
      const saved = await upsertCard(current, fsrsToRow(next));
      await supabase.from('review_logs').insert({
        user_id: session!.user.id,
        item_id: current.item.id,
        card_type: current.type,
        rating: r,
        state: prevState,
        elapsed_ms: Math.min(120000, Date.now() - shownAt.current),
      });
      setDone((d) => ({ total: d.total + 1, correct: d.correct + (r > 1 ? 1 : 0) }));

      // Card difícil (leech)
      if (r === Rating.Again && saved.lapses >= s.leechThreshold && prevState === 2) {
        if (s.leechAction === 'suspend') {
          await upsertCard({ ...current, uc: saved }, { suspended: true });
          flash('Card suspenso: errou muitas vezes');
        } else setLeech({ ...current, uc: saved });
      }

      // Se volta em menos de 20 min, recoloca na fila desta sessão.
      const soon = new Date(saved.due).getTime() - Date.now() < 20 * 60000;
      setQueue((q) => {
        if (!q) return q;
        const rest = q.slice(1);
        if (!soon || saved.suspended) return rest;
        const pos = Math.min(rest.length, r === Rating.Again ? 3 : 6);
        return [...rest.slice(0, pos), { ...current, uc: saved }, ...rest.slice(pos)];
      });
    },
    [current, intervals, upsertCard, session, s.leechThreshold, s.leechAction],
  );

  /** Avalia direto. Se errou/difícil sem ter visto a resposta, mostra antes de seguir. */
  const answer = useCallback(
    (r: Grade) => {
      if (!revealed && r <= Rating.Hard) {
        setRevealed(true);
        setPending(r);
      } else grade(r);
    },
    [revealed, grade],
  );

  // Atalhos: espaço revela/continua, 1–4 avaliam.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (pending) grade(pending);
        else setRevealed(true);
      }
      const g = GRADES.find((x) => x.key === e.key);
      if (g && !pending) answer(g.r);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending, grade, answer]);

  async function action(kind: 'star' | 'more' | 'less' | 'suspend' | 'bury' | 'reset' | 'note') {
    if (!current) return;
    setMenu(false);
    if (kind === 'star') {
      const uc = await upsertCard(current, { starred: !current.uc?.starred });
      replaceCurrent(uc);
      flash(uc.starred ? 'Marcado com estrela' : 'Estrela removida');
    } else if (kind === 'more' || kind === 'less') {
      const p = Math.max(-1, Math.min(1, (current.uc?.priority ?? 0) + (kind === 'more' ? 1 : -1)));
      replaceCurrent(await upsertCard(current, { priority: p }));
      flash(p > 0 ? 'Prioridade alta: aparece com mais frequência' : p < 0 ? 'Prioridade baixa: aparece menos' : 'Prioridade normal');
    } else if (kind === 'suspend') {
      await upsertCard(current, { suspended: true });
      replaceCurrent(null, false);
      flash('Card suspenso. Reative na página do deck.');
    } else if (kind === 'bury') {
      const t = startOfToday();
      t.setDate(t.getDate() + 1);
      await upsertCard(current, { buried_until: t.toISOString() });
      replaceCurrent(null, false);
      flash('Volta amanhã');
    } else if (kind === 'reset') {
      if (current.uc) await supabase.from('user_cards').delete().match({ user_id: session!.user.id, item_id: current.item.id, card_type: current.type });
      replaceCurrent(null, false);
      flash('Progresso do card zerado');
    } else if (kind === 'note') {
      const note = window.prompt('Sua anotação para este card (ex.: sua própria pronúncia):', current.uc?.note ?? '');
      if (note !== null) replaceCurrent(await upsertCard(current, { note: note || null }));
    }
  }

  async function askExplain() {
    if (!current) return;
    setExplain('Pensando…');
    try {
      const r = await callAI('explain', { item: current.item, language: current.deck.language });
      setExplain(r.text);
    } catch (e) {
      setExplain((e as Error).message);
    }
  }

  if (!queue) return <div className="grid min-h-[60dvh] place-items-center text-muted">Montando sua sessão…</div>;

  if (!current || timeUp) {
    const pct = done.total ? Math.round((done.correct / done.total) * 100) : 0;
    return (
      <div className="mx-auto max-w-md space-y-5 py-10 text-center">
        <div className="text-6xl">{done.total ? '🎉' : '✅'}</div>
        <h1 className="font-display text-3xl font-extrabold">{done.total ? 'Sessão concluída!' : 'Nada para revisar agora'}</h1>
        {done.total > 0 && (
          <div className="card grid grid-cols-3 gap-2 p-4">
            <Stat n={done.total} l="cards" />
            <Stat n={`${pct}%`} l="acertos" />
            <Stat n={`${Math.max(1, Math.round(elapsed / 60))} min`} l="tempo" />
          </div>
        )}
        <p className="text-muted">{done.total ? 'Os cards voltam na hora certa para você não esquecer.' : 'Volte mais tarde, ou faça uma revisão extra.'}</p>
        <div className="flex flex-col gap-2">
          <Link href="/" className="btn-primary">Voltar ao início</Link>
          <Link href="/study?extra=ahead" onClick={() => setQueue(null)} className="btn-ghost">Revisão extra (adiantar cards)</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-2xl text-muted" aria-label="Sair">×</Link>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(done.total / (done.total + queue.length)) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-muted">
          {sessionSettings.sessionMode === 'time' ? `${Math.max(0, sessionSettings.sessionMinutes * 60 - elapsed) / 60 | 0}:${String(Math.max(0, sessionSettings.sessionMinutes * 60 - elapsed) % 60).padStart(2, '0')}` : queue.length}
        </span>
        <button className="text-lg" onClick={() => saveGlobal({ audioOn: !global.audioOn })} aria-label={global.audioOn ? 'Desligar áudio' : 'Ligar áudio'}>
          {global.audioOn ? '🔊' : '🔇'}
        </button>
        <button className="relative text-xl" onClick={() => setMenu(!menu)} aria-label="Opções do card">⋯</button>
      </div>

      {menu && (
        <div className="card grid grid-cols-2 gap-2 p-3 text-sm">
          <MenuBtn onClick={() => action('star')}>{current.uc?.starred ? '★ Tirar estrela' : '☆ Marcar estrela'}</MenuBtn>
          <MenuBtn onClick={() => action('note')}>📝 Anotação</MenuBtn>
          <MenuBtn onClick={() => action('more')}>⬆ Mostrar mais vezes</MenuBtn>
          <MenuBtn onClick={() => action('less')}>⬇ Mostrar menos</MenuBtn>
          <MenuBtn onClick={() => action('bury')}>⏭ Ver amanhã</MenuBtn>
          <MenuBtn onClick={() => action('suspend')}>⏸ Suspender</MenuBtn>
          <MenuBtn onClick={() => action('reset')}>↺ Zerar progresso</MenuBtn>
          <MenuBtn onClick={askExplain}>✨ Explicar (IA)</MenuBtn>
        </div>
      )}

      <div className="flex gap-1.5">
        {current.uc === null && <span className="chip bg-blue-soft text-blue">Novo</span>}
        {current.uc?.starred && <span className="chip bg-warn-soft text-warn">★</span>}
        {(current.uc?.priority ?? 0) !== 0 && <span className="chip">{current.uc!.priority > 0 ? 'Prioridade alta' : 'Prioridade baixa'}</span>}
      </div>

      <Flashcard entry={current} s={s} revealed={revealed} onReveal={() => setRevealed(true)} onSuggest={(r, why) => setSuggested({ r, why })} />

      {explain && <div className="card whitespace-pre-wrap p-4 text-sm">✨ {explain}</div>}

      {pending ? (
        <button className="btn-primary w-full" onClick={() => grade(pending)}>Continuar</button>
      ) : (
        <>
          {suggested && <p className="text-center text-sm text-muted">{suggested.why}: sugerimos <b>{GRADES.find((g) => g.r === suggested.r)?.label}</b></p>}
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button key={g.r} onClick={() => answer(g.r)} className={`btn flex-col gap-0.5 px-1 py-2.5 ${g.cls} ${suggested?.r === g.r ? 'ring-2 ring-current' : ''}`}>
                <span>{g.label}</span>
                <span className="text-xs font-medium opacity-80">{intervals && formatInterval(intervals[g.r].due)}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {leech && (
        <div className="fixed inset-0 z-20 grid place-items-center bg-black/40 p-6">
          <div className="card max-w-sm space-y-3 p-5">
            <h2 className="font-display text-xl font-bold">Esse card está difícil</h2>
            <p className="text-sm text-muted">Você já errou “{leech.item.text_original}” {leech.uc?.lapses} vezes. Que tal mudar a estratégia?</p>
            <button className="btn-ghost w-full" onClick={async () => { await upsertCard(leech, { suspended: true }); setLeech(null); flash('Suspenso'); }}>⏸ Suspender por enquanto</button>
            <button className="btn-ghost w-full" onClick={async () => { setLeech(null); await askExplain(); }}>✨ Pedir dica para a IA</button>
            <button className="btn-primary w-full" onClick={() => setLeech(null)}>Continuar tentando</button>
          </div>
        </div>
      )}

      {toast && <div className="fixed inset-x-0 bottom-6 z-30 mx-auto w-fit rounded-full bg-ink px-4 py-2 text-sm font-semibold text-bg">{toast}</div>}
    </div>
  );
}

function Stat({ n, l }: { n: string | number; l: string }) {
  return (
    <div>
      <div className="font-display text-2xl font-extrabold">{n}</div>
      <div className="text-xs text-muted">{l}</div>
    </div>
  );
}

function MenuBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="rounded-lg bg-surface-2 px-3 py-2 text-left font-medium">{children}</button>;
}
