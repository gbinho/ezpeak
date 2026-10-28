import { NextResponse } from 'next/server';

// Feeds RSS gratuitos por idioma. O texto completo é extraído da página da matéria.
const FEEDS: Record<string, string> = {
  en: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  fr: 'https://www.france24.com/fr/rss',
  ru: 'https://feeds.bbci.co.uk/russian/rss.xml',
  ja: 'https://news.yahoo.co.jp/rss/topics/top-picks.xml',
};
const UA = { 'User-Agent': 'Mozilla/5.0 (ezpeak reader)' };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&quot;/g, '"').replace(/&apos;|&rsquo;|&lsquo;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .trim();

const tag = (xml: string, name: string) => decode(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

async function list(lang: string) {
  const xml = await (await fetch(FEEDS[lang], { headers: UA, next: { revalidate: 1800 } })).text();
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)]
    .map(([it]) => ({ title: tag(it, 'title'), url: tag(it, 'link'), date: tag(it, 'pubDate'), summary: tag(it, 'description').replace(/<[^>]+>/g, ''), image: decode(it.match(/<(?:media:thumbnail|media:content|enclosure)[^>]*url="([^"]+)"/)?.[1] ?? '') || null }))
    .filter((i) => i.title && i.url.startsWith('http'))
    .slice(0, 8);
  return items;
}

async function article(url: string) {
  const html = await (await fetch(url, { headers: UA, next: { revalidate: 3600 } })).text();
  // Só a tag <p> (e não <picture>, <path>…); prefere o conteúdo dentro de <article>.
  const body = html.match(/<article[\s>][\s\S]*<\/article>/)?.[0] ?? html;
  const paragraphs = [...body.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)]
    .map(([, p]) => decode(p.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').replace(/^\d+コメント\d+件/, ''))
    .filter((p) => p.length > 40 && !/cookie|©|copyright|newsletter|javascript|記事全文を読む|skip to content|image source|image caption|extension de votre navigateur|lecteur vidéo/i.test(p))
    // Itens de menu colados ("HomeNewsSport…") aparecem como várias palavras sem espaço entre si.
    .filter((p) => (p.match(/[a-zа-я][A-ZА-Я]/g)?.length ?? 0) < 3)
    // Menus coladas viram blocos longos sem espaço; texto de verdade tem espaços (exceto japonês).
    .filter((p) => /[぀-ヿ一-鿿]/.test(p) || (p.match(/ /g)?.length ?? 0) >= p.length / 15);
  const image = decode(html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)?.[1] ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)?.[1] ?? '') || null;
  const clean = paragraphs.filter((p) => !/^BBC News|Перейти к содержанию/.test(p));
  // Yahoo Japão: só o primeiro parágrafo é a matéria; o resto é ranking.
  return { image, paragraphs: url.includes('yahoo.co.jp') ? clean.slice(0, 1) : clean.slice(0, 8) };
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lang = q.get('lang') ?? 'en';
  if (!FEEDS[lang]) return NextResponse.json({ error: 'Idioma sem notícias' }, { status: 400 });
  try {
    const url = q.get('url');
    if (url) {
      // Só busca páginas dos sites dos feeds.
      const host = new URL(url).hostname;
      if (!Object.values(FEEDS).some((f) => host.split('.').slice(-2).join('.') === new URL(f).hostname.split('.').slice(-2).join('.') || /bbc\.(co\.uk|com)$/.test(host)))
        return NextResponse.json({ error: 'Fonte não permitida' }, { status: 400 });
      return NextResponse.json(await article(url));
    }
    return NextResponse.json({ items: await list(lang) });
  } catch {
    return NextResponse.json({ error: 'Não consegui buscar as notícias agora.' }, { status: 502 });
  }
}
