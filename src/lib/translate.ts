/**
 * Tradução grátis para português pelo endpoint público do Google Tradutor.
 * Roda no navegador (do servidor o Google bloqueia por excesso de uso).
 * Em caso de falha devolve null para cada texto.
 */
export async function toPt(texts: string[]): Promise<(string | null)[]> {
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=pt&dt=t&q=${encodeURIComponent(texts.join('\n'))}`);
    const j = (await r.json()) as [string, string][][];
    const out = j[0].map((s) => s[0]).join('').split('\n').map((t) => t.trim());
    return out.length === texts.length ? out : texts.map(() => null);
  } catch {
    return texts.map(() => null);
  }
}

/** Tradução e romanização (russo, japonês) de uma palavra. */
export async function lookup(word: string, lang: string): Promise<{ pt: string | null; roman: string | null }> {
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${lang}&tl=pt&dt=t&dt=rm&q=${encodeURIComponent(word)}`);
    const j = (await r.json()) as (string | null)[][][];
    const parts = j[0];
    return { pt: parts[0]?.[0] ?? null, roman: parts.find((p) => p[0] == null)?.[3] ?? null };
  } catch {
    return { pt: null, roman: null };
  }
}
