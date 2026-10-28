import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade, type StepUnit } from 'ts-fsrs';
import type { Settings } from './settings';
import type { UserCard } from './types';

export { Rating, State };

const parseSteps = (s: string) =>
  s.split(/\s+/).filter((x) => /^\d+[mhd]$/.test(x)) as StepUnit[];

export function makeScheduler(s: Settings) {
  return fsrs(
    generatorParameters({
      request_retention: s.retention,
      maximum_interval: s.maxInterval,
      enable_fuzz: s.fuzz,
      learning_steps: parseSteps(s.learningSteps),
      relearning_steps: parseSteps(s.relearningSteps),
    }),
  );
}

export function toFsrs(uc: UserCard | null, now = new Date()): Card {
  if (!uc) return createEmptyCard(now);
  return {
    due: new Date(uc.due),
    stability: uc.stability,
    difficulty: uc.difficulty,
    elapsed_days: uc.elapsed_days,
    scheduled_days: uc.scheduled_days,
    learning_steps: uc.learning_steps,
    reps: uc.reps,
    lapses: uc.lapses,
    state: uc.state as State,
    last_review: uc.last_review ? new Date(uc.last_review) : undefined,
  };
}

/**
 * Aplica os ajustes pessoais por cima do FSRS: prioridade do card
 * e multiplicadores de Difícil/Fácil. Só mexe em cards de revisão (intervalos em dias).
 */
function adjust(card: Card, rating: Grade, priority: number, s: Settings, now: Date): Card {
  if (card.state !== State.Review || card.scheduled_days < 1) return card;
  let mult = 1;
  if (priority > 0) mult *= s.priorityHigh;
  if (priority < 0) mult *= s.priorityLow;
  if (rating === Rating.Easy) mult *= s.easyBonus / 1.3; // 1.3 = neutro
  if (rating === Rating.Hard) mult *= s.hardFactor;
  if (mult === 1) return card;
  const days = Math.min(s.maxInterval, Math.max(1, Math.round(card.scheduled_days * mult)));
  return { ...card, scheduled_days: days, due: new Date(now.getTime() + days * 86400000) };
}

export function preview(uc: UserCard | null, s: Settings, now = new Date()) {
  const f = makeScheduler(s);
  const base = toFsrs(uc, now);
  const out = {} as Record<Grade, Card>;
  for (const r of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as Grade[]) {
    out[r] = adjust(f.next(base, now, r).card, r, uc?.priority ?? 0, s, now);
  }
  return out;
}

export function review(uc: UserCard | null, rating: Grade, s: Settings, now = new Date()) {
  return preview(uc, s, now)[rating];
}

export function formatInterval(due: Date, now = new Date()) {
  const min = Math.max(1, Math.round((due.getTime() - now.getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return `${d} d`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `${mo} mês${mo > 1 ? 'es' : ''}`;
  return `${(d / 365).toFixed(1)} ano`;
}

export function fsrsToRow(c: Card) {
  return {
    state: c.state,
    due: c.due.toISOString(),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.elapsed_days,
    scheduled_days: c.scheduled_days,
    learning_steps: c.learning_steps,
    reps: c.reps,
    lapses: c.lapses,
    last_review: c.last_review ? c.last_review.toISOString() : null,
  };
}
