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
