import { runLocal } from './local-ai';
import { buildPrompt, finish } from './prompts';
import { supabase } from './supabase';

export type AIAction = 'generate' | 'explain' | 'tutor' | 'sentences';

/** Tenta a IA do navegador primeiro; se não houver, usa a API (se configurada). */
export async function callAI<T = { text: string }>(action: AIAction, payload: Record<string, unknown>): Promise<T> {
  const prompt = buildPrompt(action, payload);
  const local = await runLocal(prompt);
  if (local !== null) {
    try {
      return finish(prompt, local) as T;
    } catch {
      throw new Error('A IA respondeu em formato inesperado. Tente de novo.');
    }
  }

  const { data } = await supabase.auth.getSession();
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token ?? ''}` },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erro na IA');
  return json as T;
}
