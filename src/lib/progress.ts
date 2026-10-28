import { supabase } from './supabase';
import type { Deck, Lang } from './types';

export type Cefr = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const CEFR: Cefr[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

// Palavras conhecidas aproximadas por nível e o que cada nível significa.
export const GOALS: Record<Cefr, { words: number; name: string; desc: string; jlpt: string; focus: Skill[] }> = {
  A1: { words: 500, name: 'Iniciante', desc: 'Se apresentar, pedir coisas simples, entender frases do dia a dia.', jlpt: 'N5', focus: ['vocab', 'listen'] },
  A2: { words: 1000, name: 'Básico', desc: 'Conversas simples sobre rotina, compras, viagens e direções.', jlpt: 'N4', focus: ['vocab', 'listen', 'speak'] },
  B1: { words: 2000, name: 'Intermediário', desc: 'Se virar sozinho em viagens, contar experiências e dar opiniões.', jlpt: 'N3', focus: ['listen', 'speak', 'read'] },
  B2: { words: 4000, name: 'Intermediário avançado', desc: 'Conversar com nativos com naturalidade e entender a maior parte de séries.', jlpt: 'N2', focus: ['listen', 'speak', 'read'] },
  C1: { words: 8000, name: 'Fluente', desc: 'Usar o idioma no trabalho e entender quase tudo sem esforço.', jlpt: 'N1', focus: ['listen', 'speak', 'read'] },
};

export type Skill = 'vocab' | 'listen' | 'speak' | 'read';
export const SKILL_LABEL: Record<Skill, string> = { vocab: 'Vocabulário', listen: 'Escuta', speak: 'Fala', read: 'Leitura' };
export const SKILL_TIP: Record<Skill, string> = {
  vocab: 'Adicione um deck novo e mantenha os cards novos diários.',
  listen: 'Ligue o áudio e faça o Ditado em Praticar.',
  speak: 'Use o treino de Pronúncia e os cards de fala.',
  read: 'Ative os cards de Lacuna e leia as frases de exemplo em voz alta.',
};

export function estimateLevel(known: number): Cefr | null {
  let lvl: Cefr | null = null;
  for (const c of CEFR) if (known >= GOALS[c].words * 0.8) lvl = c;
  return lvl;
}

export type Progress = {
  known: number;
  minutesWeek: number;
  skills: Record<Skill, number>; // 0–1
  recent: { day: string; cards: number; minutes: number }[];
};

export async function loadProgress(decks: Deck[], lang: Lang, goal: Cefr): Promise<Progress> {
  const ids = decks.filter((d) => d.language === lang).map((d) => d.id);
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const [{ data: ucs }, { data: logs }, { data: pron }] = await Promise.all([
    supabase.from('user_cards').select('item_id,scheduled_days').in('deck_id', ids),
    supabase.from('review_logs').select('created_at,rating,elapsed_ms,card_type,item_id').gte('created_at', since).order('created_at', { ascending: false }).limit(5000),
    supabase.from('pronunciation_attempts').select('score').order('created_at', { ascending: false }).limit(30),
  ]);
  const itemIds = new Set((ucs ?? []).map((u) => u.item_id));
  const myLogs = (logs ?? []).filter((l) => itemIds.has(l.item_id));
  const known = new Set((ucs ?? []).filter((u) => u.scheduled_days >= 7).map((u) => u.item_id)).size;

  const acc = (types: string[]) => {
    const l = myLogs.filter((x) => types.includes(x.card_type));
    return l.length ? l.filter((x) => x.rating > 1).length / l.length : 0;
  };
  const pronAvg = pron?.length ? pron.reduce((a, p) => a + p.score, 0) / pron.length / 100 : 0;

  const weekAgo = Date.now() - 7 * 86400000;
  const minutesWeek = Math.round(myLogs.filter((l) => +new Date(l.created_at) >= weekAgo).reduce((a, l) => a + (l.elapsed_ms ?? 0), 0) / 60000);

  const byDay = new Map<string, { cards: number; ms: number }>();
  for (const l of myLogs) {
    const k = new Date(l.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    const v = byDay.get(k) ?? { cards: 0, ms: 0 };
    v.cards++;
    v.ms += l.elapsed_ms ?? 0;
    byDay.set(k, v);
  }

  return {
    known,
    minutesWeek,
    skills: {
      vocab: Math.min(1, known / GOALS[goal].words),
      listen: acc(['listening']),
      speak: Math.max(pronAvg, acc(['pronunciation']) * 0.8),
      read: acc(['recognition', 'reading', 'cloze']),
    },
    recent: [...byDay].slice(0, 4).map(([day, v]) => ({ day, cards: v.cards, minutes: Math.max(1, Math.round(v.ms / 60000)) })),
  };
}
