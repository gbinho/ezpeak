import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-5-5';

const LANG_NAME = { en: 'inglês (americano)', ja: 'japonês' } as const;

const RESPELLING_RULES = `Regras da "pronúncia literal" (respelling_pt):
- Escreva como um brasileiro leria em voz alta para soar o mais próximo possível do nativo, usando só letras do português.
- Separe sílabas com hífen e palavras com espaço. Escreva a sílaba tônica em MAIÚSCULAS e o resto em minúsculas.
- Vogais longas: dobre a vogal (ii, uu, ÔÔ). Use "ss" para o som de s entre vogais, "dj"/"tch" quando couber.
- Exemplos: "Thank you" → "TÉNK-iu"; "Water" → "UÓ-ter"; "ありがとう" → "a-ri-ga-TÔÔ"; "すみません" → "su-mi-ma-SSÊN".
- Em "tip_pt", explique em uma frase curta o som que não existe em português (ex.: "th", vogal longa), ou null.`;

async function claude(system: string, messages: { role: 'user' | 'assistant'; content: string }[], maxTokens = 800) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.content as { type: string; text?: string }[]).filter((b) => b.type === 'text').map((b) => b.text).join('');
}

function parseJson(text: string) {
  const m = text.match(/[[{][\s\S]*[\]}]/);
  if (!m) throw new Error('Resposta da IA sem JSON');
  return JSON.parse(m[0]);
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY)
    return NextResponse.json({ error: 'IA ainda não configurada: defina ANTHROPIC_API_KEY nas variáveis de ambiente da Vercel.' }, { status: 503 });

  // Só usuários logados podem gastar tokens.
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: auth } = await sb.auth.getUser(token);
  if (!auth.user) return NextResponse.json({ error: 'Faça login.' }, { status: 401 });

  const body = await req.json();
  const lang: 'en' | 'ja' = body.language === 'ja' ? 'ja' : 'en';
  const L = LANG_NAME[lang];

  try {
    switch (body.action) {
      case 'generate': {
        const word = String(body.word ?? '').slice(0, 120);
        const text = await claude(
          `Você cria flashcards de ${L} para brasileiros. Responda APENAS com JSON.\n${RESPELLING_RULES}`,
          [{
            role: 'user',
            content: `Crie um card para: "${word}" (pode estar em português ou em ${L}; o card é sempre do ${L}).
JSON: {"text_original": string (em ${L}${lang === 'ja' ? ', em kana/kanji' : ''}), "text_romanized": ${lang === 'ja' ? 'string (romaji Hepburn)' : 'null'}, "translation_pt": string, "respelling_pt": string, "tip_pt": string|null, "example": string (frase curta e útil em ${L}), "example_pt": string, "kind": "word"|"phrase"|"chunk"}`,
          }],
        );
        return NextResponse.json(parseJson(text));
      }
      case 'explain': {
        const it = body.item ?? {};
        const text = await claude(
          `Você é um professor de ${L} paciente que explica em português simples para brasileiros, em no máximo 6 linhas. Sem markdown pesado.`,
          [{ role: 'user', content: `Estou errando muito "${it.text_original}" (${it.translation_pt}, pronúncia literal "${it.respelling_pt}"). Me dê: 1) um truque para lembrar o significado, 2) como acertar a pronúncia vindo do português, 3) uma frase de exemplo nova com tradução.` }],
          500,
        );
        return NextResponse.json({ text });
      }
      case 'sentences': {
        const words = (body.items ?? []).slice(0, 12).map((i: { text_original: string; translation_pt: string }) => `${i.text_original} (${i.translation_pt})`).join(', ');
        const text = await claude(
          `Você cria frases curtas de ${L} nível iniciante para brasileiros. Responda APENAS com JSON.\n${RESPELLING_RULES}`,
          [{ role: 'user', content: `Crie 5 frases curtas e naturais usando principalmente estas palavras que o aluno está errando: ${words}.
JSON: [{"text": string, "romanized": ${lang === 'ja' ? 'string' : 'null'}, "pt": string, "respelling_pt": string}]` }],
          1200,
        );
        return NextResponse.json({ sentences: parseJson(text) });
      }
      case 'tutor': {
        const scenario = String(body.scenario ?? 'conversa livre').slice(0, 200);
        const history = (body.messages ?? []).slice(-16) as { role: 'user' | 'assistant'; content: string }[];
        const text = await claude(
          `Você é um tutor de ${L} fazendo roleplay com um aluno brasileiro iniciante. Cenário: ${scenario}.
Fale como o personagem do cenário, com frases curtas e simples (nível A1–A2${lang === 'ja' ? ', japonês polido です/ます' : ''}).
Responda APENAS com JSON:
{"reply": string (sua fala em ${L}), "reply_romanized": ${lang === 'ja' ? 'string' : 'null'}, "reply_respelling": string (pronúncia literal), "reply_pt": string (tradução),
 "corrections": [{"wrong": string, "right": string, "explain_pt": string}] (erros da última mensagem do aluno; [] se não houver),
 "suggestion": string (uma resposta possível para o aluno dar, em ${L})}
${RESPELLING_RULES}`,
          history.length ? history : [{ role: 'user', content: '(comece a conversa)' }],
          900,
        );
        return NextResponse.json(parseJson(text));
      }
      default:
        return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
