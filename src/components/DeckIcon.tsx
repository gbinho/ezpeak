import { BookOpen, Bookmark, Ear, Hand, Hash, House, Plane, TrainFront, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react';
import type { Deck } from '@/lib/types';

// Ícone por assunto do deck (Lucide, licença ISC).
const BY_TITLE: [RegExp, LucideIcon][] = [
  [/cumpriment/i, Hand],
  [/número/i, Hash],
  [/aeroporto/i, Plane],
  [/restaurante/i, UtensilsCrossed],
  [/verbo/i, Zap],
  [/pares|vogal/i, Ear],
  [/estação|transporte/i, TrainFront],
  [/dia a dia/i, House],
];

export default function DeckIcon({ deck }: { deck: Deck }) {
  const Icon = deck.owner_id ? Bookmark : (BY_TITLE.find(([re]) => re.test(deck.title))?.[1] ?? BookOpen);
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
      <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
    </span>
  );
}
