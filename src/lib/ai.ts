import { supabase } from './supabase';

export type AIAction = 'generate' | 'explain' | 'tutor' | 'sentences';

export async function callAI<T = { text: string }>(action: AIAction, payload: Record<string, unknown>): Promise<T> {
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
