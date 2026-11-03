import type { Settings } from './settings';
import { supabase } from './supabase';
import { CARD_TYPES, type CardType, type Deck, type Item, type UserCard } from './types';

export type Entry = { item: Item; type: CardType; uc: UserCard | null; deck: Deck };

export function applicableTypes(item: Item, deck: Deck, s: Settings): CardType[] {
  return CARD_TYPES.filter((t) => {
    if (!s.cardTypes[t]) return false;
    if (t === 'reading') return deck.language === 'ja';
    if (t === 'listening') return s.audioOn;
    if (t === 'cloze') return !!item.example && item.example.toLowerCase().includes(item.text_original.toLowerCase());
    return true;
  });
}

export function startOfToday() {
  const d = new Date();
  d.setHours(4, 0, 0, 0); // o "dia" vira às 4h, como no Anki
  if (Date.now() < d.getTime()) d.setDate(d.getDate() - 1);
  return d;
}

const shuffle = <T,>(a: T[]) => {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
};

type Opts = {
  decks: Deck[];
  settingsFor: (deckId?: string) => Settings;
  session: Settings;
  extra?: 'starred' | 'ahead' | 'recent' | null;
};

export async function buildQueue({ decks, settingsFor, session, extra }: Opts): Promise<{ entries: Entry[]; counts: { due: number; fresh: number } }> {
  const deckIds = decks.map((d) => d.id);
  if (!deckIds.length) return { entries: [], counts: { due: 0, fresh: 0 } };
  const deckById = Object.fromEntries(decks.map((d) => [d.id, d]));

  const [{ data: items }, { data: cards }, { data: logs }] = await Promise.all([
    supabase.from('items').select('*').in('deck_id', deckIds).order('sort_order'),
    supabase.from('user_cards').select('*').in('deck_id', deckIds),
    supabase.from('review_logs').select('item_id,card_type,state').gte('created_at', startOfToday().toISOString()),
  ]);
  const allItems = (items as Item[]) ?? [];
  const ucs = (cards as UserCard[]) ?? [];
  const todayLogs = logs ?? [];
  const key = (i: string, t: string) => `${i}:${t}`;
  const ucByKey = new Map(ucs.map((u) => [key(u.item_id, u.card_type), u]));
  const itemById = new Map(allItems.map((i) => [i.id, i]));
  const now = Date.now();
  const learnAhead = now + 20 * 60000;

  // Palavras recentes: as últimas adicionadas, sem limite diário.
  if (extra === 'recent') {
    const newest = [...allItems].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, session.sessionSize);
    const entries = newest.map((item) => ({ item, type: 'recognition' as const, uc: ucByKey.get(key(item.id, 'recognition')) ?? null, deck: deckById[item.deck_id] }));
    return { entries, counts: { due: entries.length, fresh: 0 } };
  }

  // Revisão extra: não mexe no limite diário.
  if (extra) {
    const pool = ucs.filter((u) => !u.suspended && itemById.has(u.item_id) && (extra === 'starred' ? u.starred : new Date(u.due).getTime() > now));
    const sorted = extra === 'ahead' ? pool.sort((a, b) => +new Date(a.due) - +new Date(b.due)) : shuffle(pool);
    const entries = sorted.slice(0, session.sessionSize).map((uc) => ({ item: itemById.get(uc.item_id)!, type: uc.card_type, uc, deck: deckById[uc.deck_id] }));
    return { entries, counts: { due: entries.length, fresh: 0 } };
  }

  const reviewedToday = new Set(todayLogs.map((l) => l.item_id));
  const introducedToday = new Map<string, number>();
  const reviewsToday = new Map<string, number>();
  for (const l of todayLogs) {
    const deckId = itemById.get(l.item_id)?.deck_id;
    if (!deckId) continue;
    const m = l.state === 0 ? introducedToday : reviewsToday;
    m.set(deckId, (m.get(deckId) ?? 0) + 1);
  }

  const due: Entry[] = [];
  const fresh: Entry[] = [];
  const itemsInQueue = new Set<string>();
  const dueLeft: Record<string, number> = {};
  const newLeft: Record<string, number> = {};
  for (const d of decks) {
    const s = settingsFor(d.id);
    dueLeft[d.id] = Math.max(0, s.maxReviewsPerDay - (reviewsToday.get(d.id) ?? 0));
    newLeft[d.id] = Math.max(0, s.newPerDay - (introducedToday.get(d.id) ?? 0));
  }
  // Limite global também vale quando estudando vários decks juntos.
  let globalNew = Math.max(0, session.newPerDay - [...introducedToday.values()].reduce((a, b) => a + b, 0));

  const dueCards = ucs
    .filter((u) => !u.suspended && !(u.buried_until && new Date(u.buried_until).getTime() > now))
    .filter((u) => {
      const t = new Date(u.due).getTime();
      return u.state === 1 || u.state === 3 ? t <= learnAhead : t <= now;
    })
    .sort((a, b) => +new Date(a.due) - +new Date(b.due));

  for (const uc of dueCards) {
    const item = itemById.get(uc.item_id);
    const deck = deckById[uc.deck_id];
    if (!item || !deck) continue;
    const s = settingsFor(deck.id);
    if (!applicableTypes(item, deck, s).includes(uc.card_type)) continue;
    if (dueLeft[deck.id] <= 0) continue;
    if (s.burySiblings && itemsInQueue.has(item.id) && uc.state === 2) continue;
    dueLeft[deck.id]--;
    itemsInQueue.add(item.id);
    due.push({ item, type: uc.card_type, uc, deck });
  }

  for (const d of decks) {
    const s = settingsFor(d.id);
    const deckItems = allItems.filter((i) => i.deck_id === d.id);
    const ordered = s.newOrder === 'random' ? shuffle(deckItems) : deckItems;
    for (const item of ordered) {
      for (const type of applicableTypes(item, d, s)) {
        if (newLeft[d.id] <= 0 || globalNew <= 0) break;
        if (ucByKey.has(key(item.id, type))) continue;
        if (s.burySiblings && (itemsInQueue.has(item.id) || reviewedToday.has(item.id))) continue;
        fresh.push({ item, type, uc: null, deck: d });
        itemsInQueue.add(item.id);
        newLeft[d.id]--;
        globalNew--;
      }
    }
  }

  let entries: Entry[];
  if (session.mixMode === 'newFirst') entries = [...fresh, ...due];
  else if (session.mixMode === 'reviewsFirst') entries = [...due, ...fresh];
  else {
    // Intercala: um novo a cada N revisões.
    entries = [];
    const gap = fresh.length ? Math.max(1, Math.floor(due.length / fresh.length)) : 1;
    let f = 0;
    due.forEach((e, i) => {
      entries.push(e);
      if ((i + 1) % gap === 0 && f < fresh.length) entries.push(fresh[f++]);
    });
    entries.push(...fresh.slice(f));
  }
  if (session.sessionMode === 'count') entries = entries.slice(0, session.sessionSize);
  return { entries, counts: { due: due.length, fresh: fresh.length } };
}
