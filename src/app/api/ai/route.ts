import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { buildPrompt, finish } from '@/lib/prompts';

// Reserva opcional: só usado quando a IA do navegador não está disponível e há chave configurada.
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-5-5';

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: 'A IA do seu navegador não está disponível. Use o Chrome ou Edge atualizados em um computador ou celular com suporte a WebGPU.' }, { status: 503 });

  // Só usuários logados podem gastar tokens.
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: auth } = await sb.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  try {
    const body = await req.json();
    const p = buildPrompt(body.action, body);
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: p.maxTokens, system: p.system, messages: p.messages }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const text = (data.content as { type: string; text?: string }[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
    return NextResponse.json(finish(p, text));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
