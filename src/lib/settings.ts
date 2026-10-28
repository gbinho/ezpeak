import type { CardType, Lang } from './types';

export type Settings = {
  // Ritmo diário
  newPerDay: number;
  maxReviewsPerDay: number;
  newOrder: 'sequential' | 'random';
  mixMode: 'mixed' | 'newFirst' | 'reviewsFirst';
  // Frequência e intervalos
  retention: number;
  learningSteps: string;
  relearningSteps: string;
  maxInterval: number;
  easyBonus: number;
  hardFactor: number;
  priorityHigh: number;
  priorityLow: number;
  fuzz: boolean;
  // Cards difíceis e irmãos
  leechThreshold: number;
  leechAction: 'suspend' | 'warn';
  burySiblings: boolean;
  // Tipos de card
  cardTypes: Record<CardType, boolean>;
  typeAnswer: boolean;
  // Exibição
  autoplay: 'front' | 'back' | 'never';
  audioRate: number;
  crutch: 'auto' | 'always' | 'tap' | 'never';
  crutchAfter: number;
  jaScript: 'kana+romaji' | 'kana' | 'romaji';
  // Sessão
  sessionMode: 'count' | 'time';
  sessionSize: number;
  sessionMinutes: number;
  // Pronúncia
  autoGradePronunciation: boolean;
  pronunciationGood: number;
  pronunciationEasy: number;
  // Metas
  dailyGoalMinutes: number;
};

export type GlobalSettings = Settings & {
  language: Lang;
  disabledDecks: string[];
  onboarded: boolean;
};

export const DEFAULTS: GlobalSettings = {
  language: 'en',
  disabledDecks: [],
  onboarded: false,
  newPerDay: 10,
  maxReviewsPerDay: 150,
  newOrder: 'sequential',
  mixMode: 'mixed',
  retention: 0.9,
  learningSteps: '1m 10m',
  relearningSteps: '10m',
  maxInterval: 365,
  easyBonus: 1.3,
  hardFactor: 1.0,
  priorityHigh: 0.7,
  priorityLow: 1.4,
  fuzz: true,
  leechThreshold: 6,
  leechAction: 'warn',
  burySiblings: true,
  cardTypes: { recognition: true, production: true, listening: true, pronunciation: true, reading: true, cloze: false },
  typeAnswer: false,
  autoplay: 'front',
  audioRate: 1,
  crutch: 'auto',
  crutchAfter: 3,
  jaScript: 'kana+romaji',
  sessionMode: 'count',
  sessionSize: 20,
  sessionMinutes: 10,
  autoGradePronunciation: true,
  pronunciationGood: 75,
  pronunciationEasy: 92,
  dailyGoalMinutes: 10,
};

// Configurações que podem ser sobrescritas por deck.
export const DECK_OVERRIDABLE: (keyof Settings)[] = [
  'newPerDay', 'maxReviewsPerDay', 'newOrder', 'retention', 'learningSteps', 'relearningSteps',
  'maxInterval', 'easyBonus', 'hardFactor', 'cardTypes', 'leechThreshold', 'autoplay', 'crutch',
];

export const PRESETS: { id: string; name: string; desc: string; values: Partial<Settings> }[] = [
  { id: 'leve', name: 'Ritmo leve', desc: '5 novos/dia, retenção 85%. Pouca revisão.', values: { newPerDay: 5, retention: 0.85, maxReviewsPerDay: 60, sessionSize: 15 } },
  { id: 'padrao', name: 'Padrão', desc: '10 novos/dia, retenção 90%.', values: { newPerDay: 10, retention: 0.9, maxReviewsPerDay: 150, sessionSize: 20 } },
  { id: 'viagem', name: 'Viagem em 30 dias', desc: '25 novos/dia, retenção 85%, intervalo máx. 30 dias.', values: { newPerDay: 25, retention: 0.85, maxInterval: 30, maxReviewsPerDay: 300, sessionSize: 40 } },
  { id: 'intensivo', name: 'Intensivo', desc: '20 novos/dia, retenção 95%. Muitas revisões.', values: { newPerDay: 20, retention: 0.95, maxReviewsPerDay: 400, sessionSize: 50 } },
];

export function effectiveSettings(global: GlobalSettings, deckOverrides?: Partial<Settings>): Settings {
  const merged = { ...DEFAULTS, ...global, ...(deckOverrides ?? {}) };
  merged.cardTypes = { ...DEFAULTS.cardTypes, ...global.cardTypes, ...(deckOverrides?.cardTypes ?? {}) };
  return merged;
}

/** Estimativa grosseira de revisões/dia em regime estável. */
export function estimateDailyReviews(newPerDay: number, retention: number, cardTypesOn: number) {
  const factor = 1 / Math.max(0.02, 1 - retention); // retenção maior → intervalos menores
  return Math.round(newPerDay * cardTypesOn * (factor / 6));
}
