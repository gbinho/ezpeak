import { NextResponse } from 'next/server';

// Busca músicas na API pública do iTunes e repassa o áudio da prévia de 30s
// (o navegador precisa dos bytes para transcrever, e a Apple não libera CORS).
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;

  const audio = q.get('audio');
  if (audio) {
    const host = new URL(audio).hostname;
    if (!/(\.|^)(itunes\.apple\.com|mzstatic\.com)$/.test(host)) return NextResponse.json({ error: 'Fonte não permitida' }, { status: 400 });
    const r = await fetch(audio);
    return new Response(r.body, { headers: { 'Content-Type': r.headers.get('content-type') ?? 'audio/mp4', 'Cache-Control': 'public, max-age=86400' } });
  }

  const term = q.get('q')?.trim();
  if (!term) return NextResponse.json({ items: [] });
  try {
    const r = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=25`, { next: { revalidate: 86400 } });
    const j = await r.json();
    const items = (j.results ?? [])
      .filter((s: Record<string, unknown>) => s.previewUrl)
      .map((s: Record<string, string | number>) => ({
        id: s.trackId,
        title: s.trackName,
        artist: s.artistName,
        album: s.collectionName,
        cover: String(s.artworkUrl100).replace('100x100', '300x300'),
        preview: s.previewUrl,
        duration: Math.round(Number(s.trackTimeMillis) / 1000),
        url: s.trackViewUrl,
      }));
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: 'Não consegui buscar músicas agora.' }, { status: 502 });
  }
}
