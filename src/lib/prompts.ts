// Prompts das funções de IA, usados tanto pela IA local (navegador) quanto pela API.

export type Msg = { role: 'user' | 'assistant'; content: string };
export type Prompt = { system: string; messages: Msg[]; maxTokens: number; json: boolean; wrap?: (parsed: unknown) => unknown };

const LANG_NAME = { en: 'inglês (americano)', ja: 'japonês' } as const;

const RESPELLING_RULES = `Regras da "pronúncia literal" (respelling_pt):
- Escreva como um brasileiro leria em voz alta para soar o mais próximo possível do nativo, usando só letras do português.
- Separe sílabas com hífen e palavras com espaço. Escreva a sílaba tônica em MAIÚSCULAS e o resto em minúsculas.
- Vogais longas: dobre a vogal (ii, uu, ÔÔ). Use "ss" para o som de s entre vogais, "dj"/"tch" quando couber.
- Exemplos: "Thank you" → "TÉNK-iu"; "Water" → "UÓ-ter"; "ありがとう" → "a-ri-ga-TÔÔ"; "すみません" → "su-mi-ma-SSÊN".
- Em "tip_pt", explique em uma frase curta o som que não existe em português (ex.: "th", vogal longa), ou null.`;

export function buildPrompt(action: string, body: Record<string, unknown>): Prompt {
  const lang: 'en' | 'ja' = body.language === 'ja' ? 'ja' : 'en';
  const L = LANG_NAME[lang];
  switch (action) {
    case 'generate': {
      const word = String(body.word ?? '').slice(0, 120);
      return {
        json: true,
        maxTokens: 800,
        system: `Você cria flashcards de ${L} para brasileiros. Responda APENAS com JSON.\n${RESPELLING_RULES}`,
        messages: [{
          role: 'user',
          content: `Crie um card para: "${word}" (pode estar em português ou em ${L}; o card é sempre do ${L}).
JSON: {"text_original": string (em ${L}${lang === 'ja' ? ', em kana/kanji' : ''}), "text_romanized": ${lang === 'ja' ? 'string (romaji Hepburn)' : 'null'}, "translation_pt": string, "respelling_pt": string, "tip_pt": string|null, "example": string (frase curta e útil em ${L}), "example_pt": string, "kind": "word"|"phrase"|"chunk"}`,
        }],
      };
    }
    case 'explain': {
      const it = (body.item ?? {}) as Record<string, string>;
      return {
        json: false,
        maxTokens: 500,
        system: `Você é um professor de ${L} paciente que explica em português simples para brasileiros, em no máximo 6 linhas. Sem markdown pesado.`,
        messages: [{ role: 'user', content: `Estou errando muito "${it.text_original}" (${it.translation_pt}, pronúncia literal "${it.respelling_pt}"). Me dê: 1) um truque para lembrar o significado, 2) como acertar a pronúncia vindo do português, 3) uma frase de exemplo nova com tradução.` }],
      };
    }
    case 'sentences': {
      const items = (body.items ?? []) as { text_original: string; translation_pt: string }[];
      const words = items.slice(0, 12).map((i) => `${i.text_original} (${i.translation_pt})`).join(', ');
      return {
        json: true,
        maxTokens: 1200,
        wrap: (p) => ({ sentences: p }),
        system: `Você cria frases curtas de ${L} nível iniciante para brasileiros. Responda APENAS com JSON.\n${RESPELLING_RULES}`,
        messages: [{ role: 'user', content: `Crie 5 frases curtas e naturais usando principalmente estas palavras que o aluno está errando: ${words}.
JSON: [{"text": string, "romanized": ${lang === 'ja' ? 'string' : 'null'}, "pt": string, "respelling_pt": string}]` }],
      };
    }
    case 'tutor': {
      const scenario = String(body.scenario ?? 'conversa livre').slice(0, 200);
      const history = ((body.messages ?? []) as Msg[]).slice(-16);
      return {
        json: true,
        maxTokens: 900,
        system: `Você é um tutor de ${L} fazendo roleplay com um aluno brasileiro iniciante. Cenário: ${scenario}.
Fale como o personagem do cenário, com frases curtas e simples (nível A1–A2${lang === 'ja' ? ', japonês polido です/ます' : ''}).
Responda APENAS com JSON:
{"reply": string (sua fala em ${L}), "reply_romanized": ${lang === 'ja' ? 'string' : 'null'}, "reply_respelling": string (pronúncia literal), "reply_pt": string (tradução),
 "corrections": [{"wrong": string, "right": string, "explain_pt": string}] (erros da última mensagem do aluno; [] se não houver),
 "suggestion": string (uma resposta possível para o aluno dar, em ${L})}
${RESPELLING_RULES}`,
        messages: history.length ? history : [{ role: 'user', content: '(comece a conversa)' }],
      };
    }
    default:
      throw new Error('Ação desconhecida');
  }
}

export function parseJson(text: string) {
  const m = text.match(/[[{][\s\S]*[\]}]/);
  if (!m) throw new Error('Resposta da IA sem JSON');
  return JSON.parse(m[0]);
}

/** Converte o texto da IA no formato que as telas esperam. */
export function finish(p: Prompt, text: string) {
  if (!p.json) return { text };
  const parsed = parseJson(text);
  const out = p.wrap ? p.wrap(parsed) : parsed;
  // Modelos pequenos às vezes esquecem campos: completa com valores seguros.
  if (out && typeof out === 'object' && 'reply' in (out as object)) {
    const r = out as Record<string, unknown>;
    r.corrections ??= [];
    r.reply_respelling ??= '';
    r.reply_pt ??= '';
  }
  return out;
}
