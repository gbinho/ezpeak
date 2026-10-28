export type Lang = 'en' | 'ja';

export const CARD_TYPES = ['recognition', 'production', 'listening', 'pronunciation', 'reading', 'cloze'] as const;
export type CardType = (typeof CARD_TYPES)[number];

export const CARD_TYPE_LABEL: Record<CardType, string> = {
  recognition: 'Reconhecimento',
  production: 'Produção',
  listening: 'Escuta',
  pronunciation: 'Pronúncia',
  reading: 'Leitura (japonês)',
  cloze: 'Lacuna (cloze)',
};

export type Deck = {
  id: string;
  language: Lang;
  title: string;
  theme: string;
  level: string | null;
  description: string | null;
  is_survival: boolean;
  sort_order: number;
  owner_id: string | null;
};

export type Item = {
  id: string;
  deck_id: string;
  kind: 'word' | 'phrase' | 'chunk';
  text_original: string;
  text_romanized: string | null;
  translation_pt: string;
  respelling_pt: string;
  tip_pt: string | null;
  example: string | null;
  example_pt: string | null;
  sort_order: number;
  owner_id: string | null;
};

export type UserCard = {
  user_id: string;
  item_id: string;
  card_type: CardType;
  deck_id: string;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: string | null;
  priority: number;
  suspended: boolean;
  buried_until: string | null;
  starred: boolean;
  note: string | null;
};
