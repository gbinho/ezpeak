'use client';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULTS, effectiveSettings, type GlobalSettings, type Settings } from './settings';
import { supabase } from './supabase';
import type { Deck } from './types';

type Ctx = {
  session: Session | null;
  loading: boolean;
  global: GlobalSettings;
  deckOverrides: Record<string, Partial<Settings>>;
  decks: Deck[];
  saveGlobal: (patch: Partial<GlobalSettings>) => Promise<void>;
  saveDeck: (deckId: string, patch: Partial<Settings> | null) => Promise<void>;
  settingsFor: (deckId?: string) => Settings;
  reloadDecks: () => Promise<void>;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [global, setGlobal] = useState<GlobalSettings>(DEFAULTS);
  const [deckOverrides, setDeckOverrides] = useState<Record<string, Partial<Settings>>>({});
  const [decks, setDecks] = useState<Deck[]>([]);

  const reloadDecks = useCallback(async () => {
    const { data } = await supabase.from('decks').select('*').order('sort_order');
    setDecks((data as Deck[]) ?? []);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  // Depende só do id: a renovação do token ao voltar para a aba não pode recarregar o app.
  const userId = session?.user.id;
  useEffect(() => {
    (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data } = await supabase.from('user_settings').select('*').maybeSingle();
      if (data) {
        const g = { ...DEFAULTS, ...data.global, cardTypes: { ...DEFAULTS.cardTypes, ...data.global?.cardTypes } };
        // Contas antigas: o idioma ativo vira o primeiro idioma da lista.
        if (g.onboarded && !g.languages.length) g.languages = [g.language];
        setGlobal(g);
        setDeckOverrides(data.decks ?? {});
      }
      await reloadDecks();
      setLoading(false);
    })();
  }, [userId, reloadDecks]);

  const persist = useCallback(
    async (g: GlobalSettings, d: Record<string, Partial<Settings>>) => {
      if (!session) return;
      await supabase
        .from('user_settings')
        .upsert({ user_id: session.user.id, global: g, decks: d, updated_at: new Date().toISOString() });
    },
    [session],
  );

  const saveGlobal = useCallback(
    async (patch: Partial<GlobalSettings>) => {
      const next = { ...global, ...patch };
      setGlobal(next);
      await persist(next, deckOverrides);
    },
    [global, deckOverrides, persist],
  );

  const saveDeck = useCallback(
    async (deckId: string, patch: Partial<Settings> | null) => {
      const next = { ...deckOverrides };
      if (patch === null) delete next[deckId];
      else next[deckId] = { ...next[deckId], ...patch };
      setDeckOverrides(next);
      await persist(global, next);
    },
    [global, deckOverrides, persist],
  );

  const settingsFor = useCallback(
    (deckId?: string) => effectiveSettings(global, deckId ? deckOverrides[deckId] : undefined),
    [global, deckOverrides],
  );

  return (
    <AppContext.Provider
      value={{ session, loading, global, deckOverrides, decks, saveGlobal, saveDeck, settingsFor, reloadDecks }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp fora do AppProvider');
  return ctx;
}
