'use client';
import { useEffect } from 'react';
import { useApp } from './app-context';
import { supabase } from './supabase';

export type ActivityKind = 'reading' | 'music' | 'practice' | 'tutor';

/**
 * Registra o tempo ativo numa atividade (leitura, música, prática, tutor).
 * Conta só com a aba visível e grava ao sair, ao esconder a aba ou a cada 2 min.
 */
export function useTrack(kind: ActivityKind | null) {
  const { session, global } = useApp();
  const userId = session?.user.id;
  const lang = global.language;

  useEffect(() => {
    if (!kind || !userId) return;
    let since = document.visibilityState === 'visible' ? Date.now() : 0;
    let pending = 0;

    const flush = () => {
      if (since) {
        pending += Date.now() - since;
        since = document.visibilityState === 'visible' ? Date.now() : 0;
      }
      const seconds = Math.round(pending / 1000);
      if (seconds >= 10) {
        pending = 0;
        supabase.from('activity_logs').insert({ user_id: userId, kind, language: lang, seconds }).then(() => {});
      }
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
      else since = Date.now();
    };
    const timer = setInterval(flush, 120000);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVis);
      flush();
    };
  }, [kind, userId, lang]);
}
