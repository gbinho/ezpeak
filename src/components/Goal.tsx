'use client';
import { Flag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { CEFR, estimateLevel, GOALS, loadProgress, SKILL_LABEL, SKILL_TIP, type Cefr, type Progress, type Skill } from '@/lib/progress';
import { LANG_LABEL } from '@/lib/settings';

export function useGoal() {
  const { global } = useApp();
  return (global.goals[global.language] ?? 'B1') as Cefr;
}

/** Caminho A1 → C1 com o nível atual e o objetivo. */
export function GoalPath({ known, goal }: { known: number; goal: Cefr }) {
  const current = estimateLevel(known);
  const ci = current ? CEFR.indexOf(current) : -1;
  const gi = CEFR.indexOf(goal);
  const pct = Math.min(100, (known / GOALS[goal].words) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center">
        {CEFR.map((c, i) => (
          <div key={c} className="flex flex-1 items-center last:flex-none">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                i <= ci ? 'bg-accent text-accent-ink' : i === gi ? 'border-2 border-accent text-accent' : 'bg-surface-2 text-muted'
              }`}
            >
              {i === gi && i > ci ? <Flag className="h-3.5 w-3.5" /> : c}
            </span>
            {i < CEFR.length - 1 && <span className={`h-0.5 flex-1 ${i < ci ? 'bg-accent' : 'bg-surface-2'}`} />}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-muted tabular-nums">
        <span>{known} palavras</span>
        <span>{Math.round(pct)}% até {goal} ({GOALS[goal].words})</span>
      </div>
    </div>
  );
}

function Skills({ p, goal }: { p: Progress; goal: Cefr }) {
  const focus = GOALS[goal].focus;
  const weakest = [...focus].sort((a, b) => p.skills[a] - p.skills[b])[0];
  return (
    <div className="space-y-3">
      {(Object.keys(SKILL_LABEL) as Skill[]).map((s) => (
        <div key={s} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className={focus.includes(s) ? 'font-semibold' : 'text-muted'}>{SKILL_LABEL[s]}{focus.includes(s) && <span className="ml-1.5 text-xs font-normal text-accent">importante no {goal}</span>}</span>
            <span className="text-muted tabular-nums">{Math.round(p.skills[s] * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full rounded-full ${s === weakest ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${p.skills[s] * 100}%` }} />
          </div>
        </div>
      ))}
      <p className="rounded-xl bg-warn-soft p-3 text-sm">
        <b>Próximo passo: {SKILL_LABEL[weakest].toLowerCase()}.</b> {SKILL_TIP[weakest]}
      </p>
    </div>
  );
}

/** Tela de objetivo: escolher o nível desejado e ver o caminho até ele. */
export default function Goal() {
  const { global, saveGlobal, decks } = useApp();
  const goal = useGoal();
  const [p, setP] = useState<Progress | null>(null);

  useEffect(() => {
    loadProgress(decks, global.language, goal).then(setP);
  }, [decks, global.language, goal]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted">O que você quer alcançar em {LANG_LABEL[global.language].split(' ')[1].toLowerCase()}?</p>
      <div className="card divide-y divide-line overflow-hidden">
        {CEFR.map((c) => {
          const on = c === goal;
          return (
            <button key={c} onClick={() => saveGlobal({ goals: { ...global.goals, [global.language]: c } })} className={`flex w-full gap-3 px-4 py-3 text-left transition ${on ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}>
              <span className={`w-8 shrink-0 font-display text-lg font-extrabold ${on ? 'text-accent' : 'text-muted'}`}>{c}</span>
              <span className="flex-1">
                <span className="block font-semibold">
                  {GOALS[c].name}
                  {global.language === 'ja' && <span className="ml-1.5 text-xs font-normal text-muted">≈ JLPT {GOALS[c].jlpt}</span>}
                </span>
                {on && <span className="block text-sm text-muted">{GOALS[c].desc}</span>}
              </span>
            </button>
          );
        })}
      </div>
      {p && (
        <>
          <GoalPath known={p.known} goal={goal} />
          <Skills p={p} goal={goal} />
        </>
      )}
    </div>
  );
}
