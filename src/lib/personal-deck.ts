import { supabase } from './supabase';
import { lookup } from './translate';
import type { Lang } from './types';

/** Deck "Minhas palavras" do usuário no idioma; cria se não existir. */
export async function personalDeckId(userId: string, lang: Lang) {
  const { data } = await supabase.from('decks').select('id').eq('owner_id', userId).eq('language', lang).limit(1);
  if (data?.[0]) return data[0].id as string;
  const { data: created } = await supabase
    .from('decks')
    .insert({ language: lang, title: 'Minhas palavras', theme: 'pessoal', description: 'Cards que você criou.', owner_id: userId, sort_order: 99 })
    .select('id')
    .single();
  return created!.id as string;
}

/**
 * Cria cards para palavras grifadas. Não depende da IA: traduz pelo Google Tradutor.
 * Palavras repetidas são ignoradas. Devolve quantas foram processadas.
 */
export async function wordsToCards(userId: string, lang: Lang, words: string[], onStep?: (n: number) => void) {
  const deckId = await personalDeckId(userId, lang);
  const { data } = await supabase.from('items').select('text_original').eq('deck_id', deckId);
  const known = new Set((data ?? []).map((i) => i.text_original.toLowerCase()));
  let n = 0;
  for (const word of words) {
    if (!known.has(word.toLowerCase())) {
      const { pt, roman } = await lookup(word, lang);
      if (!pt) continue;
      // Russo e japonês: romanização. Inglês e francês: o Google devolve IPA, então usa a própria palavra.
      const latin = lang === 'ja' || lang === 'ru' ? roman : null;
      await supabase.from('items').insert({
        deck_id: deckId,
        owner_id: userId,
        kind: 'word',
        text_original: word,
        text_romanized: latin,
        translation_pt: pt,
        respelling_pt: latin ?? word,
        sort_order: Date.now() % 1e9,
      });
    }
    onStep?.(++n);
  }
  return n;
}
