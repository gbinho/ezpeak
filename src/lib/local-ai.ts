'use client';
// IA que roda no próprio navegador, sem chave e sem custo:
// 1) IA embutida do Chrome (Gemini Nano), quando existe;
// 2) WebLLM (Qwen 2.5 1.5B via WebGPU), baixado uma vez e guardado em cache.
import type { MLCEngineInterface } from '@mlc-ai/web-llm';
import type { Prompt } from './prompts';

const WEBLLM_MODEL = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';

// ---------- progresso do download (lido pelo <AIStatus />) ----------
export type AIProgress = { text: string; pct: number } | null;
let progress: AIProgress = null;
const listeners = new Set<(p: AIProgress) => void>();
function setProgress(p: AIProgress) {
  progress = p;
  listeners.forEach((l) => l(p));
}
export function onProgress(l: (p: AIProgress) => void) {
  listeners.add(l);
  l(progress);
  return () => listeners.delete(l);
}

// ---------- IA embutida do Chrome ----------
type ChromeLM = {
  availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>;
  create(o: { initialPrompts: { role: string; content: string }[]; monitor?: (m: EventTarget) => void }): Promise<{ prompt(t: string): Promise<string>; destroy(): void }>;
};
const chromeLM = () => (globalThis as unknown as { LanguageModel?: ChromeLM }).LanguageModel;

async function chromeAvailable() {
  try {
    const lm = chromeLM();
    // Só quando já está pronto: "downloadable" dispararia um download grande sem aviso.
    return !!lm && (await lm.availability()) === 'available';
  } catch {
    return false;
  }
}

async function runChrome(p: Prompt) {
  const lm = chromeLM()!;
  const history = p.messages.slice(0, -1);
  const last = p.messages[p.messages.length - 1];
  const session = await lm.create({
    initialPrompts: [{ role: 'system', content: p.system }, ...history],
    monitor: (m) =>
      m.addEventListener('downloadprogress', (e) => {
        const pct = Math.round(((e as unknown as { loaded: number }).loaded ?? 0) * 100);
        setProgress(pct < 100 ? { text: 'Preparando a IA do Chrome', pct } : null);
      }),
  });
  try {
    return await session.prompt(last.content);
  } finally {
    session.destroy();
    setProgress(null);
  }
}

// ---------- WebLLM ----------
let engine: Promise<MLCEngineInterface> | null = null;

export function webgpuAvailable() {
  return typeof navigator !== 'undefined' && 'gpu' in navigator;
}

function getEngine() {
  if (!engine) {
    engine = import('@mlc-ai/web-llm')
      .then(({ CreateMLCEngine }) =>
        CreateMLCEngine(WEBLLM_MODEL, {
          initProgressCallback: (r) => setProgress(r.progress < 1 ? { text: 'Baixando a IA (só na primeira vez)', pct: Math.round(r.progress * 100) } : null),
        }),
      )
      .catch((e) => {
        engine = null;
        setProgress(null);
        throw e;
      });
  }
  return engine;
}

const CONSENT_KEY = 'ezpeak-ai-consent';
function hasConsent() {
  try {
    if (localStorage.getItem(CONSENT_KEY)) return true;
  } catch {}
  const ok = window.confirm('A IA roda no seu aparelho, grátis. Ela precisa baixar cerca de 1 GB uma única vez (melhor no Wi-Fi). Baixar agora?');
  if (ok) try { localStorage.setItem(CONSENT_KEY, '1'); } catch {}
  return ok;
}

async function runWebLLM(p: Prompt) {
  if (!hasConsent()) throw new Error('Download da IA cancelado.');
  const e = await getEngine();
  const r = await e.chat.completions.create({
    messages: [{ role: 'system', content: p.system }, ...p.messages],
    max_tokens: p.maxTokens,
    temperature: 0.4,
  });
  return r.choices[0]?.message?.content ?? '';
}

/** Roda o prompt localmente. Retorna null se o navegador não tem como rodar IA. */
export async function runLocal(p: Prompt): Promise<string | null> {
  if (await chromeAvailable()) {
    try {
      return await runChrome(p);
    } catch {
      /* cai para o WebLLM */
    }
  }
  if (webgpuAvailable()) return runWebLLM(p);
  return null;
}
