import { callAI } from './ai';
import { supabase } from './supabase';
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

const MYMEMORY_LANG: Record<Lang, string> = { en: 'en', ja: 'ja', ru: 'ru', fr: 'fr' };

/**
 * Cria cards para palavras soltas. Usa a IA local; sem ela, traduz pelo MyMemory (grátis)
 * e usa a própria palavra como pronúncia, que a pessoa pode editar depois.
 */
export async function wordsToCards(userId: string, lang: Lang, words: string[], context: string, onStep?: (n: number) => void) {
  const deckId = await personalDeckId(userId, lang);
  let n = 0;
  for (const word of words) {
    let row: Record<string, unknown> | null = null;
    try {
      row = await callAI<Record<string, unknown>>('generate', { word: `${word} (no contexto: "${context.slice(0, 160)}")`, language: lang });
    } catch {
      try {
        const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=${MYMEMORY_LANG[lang]}|pt-br`).then((x) => x.json());
        row = { text_original: word, translation_pt: r.responseData?.translatedText ?? '?', respelling_pt: word, kind: 'word' };
      } catch {
        row = null;
      }
    }
    if (row?.text_original) {
      await supabase.from('items').insert({ ...row, deck_id: deckId, owner_id: userId, sort_order: Date.now() % 1e9 });
      onStep?.(++n);
    }
  }
  return n;
}
