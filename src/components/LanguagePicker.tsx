'use client';
import { useState } from 'react';
import { useApp } from '@/lib/app-context';
import { LANG_LABEL, LEVELS, type Level } from '@/lib/settings';
import { LANGS, type Lang } from '@/lib/types';
import Flag from './Flag';

/** Escolhe idioma e nível. Usado no primeiro login e para adicionar outro idioma. */
export default function LanguagePicker({ onDone }: { onDone?: () => void }) {
  const { global, saveGlobal, decks } = useApp();
  const available = [...LANGS].filter((l) => !global.languages.includes(l));
  const [lang, setLang] = useState<Lang | null>(available.length === 1 ? available[0] : null);

  async function pick(level: Level) {
    const values = LEVELS.find((l) => l.id === level)!.values;
    await saveGlobal({
      ...(global.languages.length ? {} : values), // nível define o ritmo só no primeiro idioma
      language: lang!,
      languages: [...global.languages, lang!],
      levels: { ...global.levels, [lang!]: level },
      // Começa com o primeiro deck do idioma; os outros aparecem em "Próximos".
      addedDecks: [...(global.addedDecks ?? []), ...decks.filter((d) => d.language === lang && !d.owner_id).slice(0, 1).map((d) => d.id)],
      onboarded: true,
    });
    onDone?.();
  }

  if (!lang)
    return (
      <div className="space-y-3">
        <h1 className="font-display text-2xl font-bold">O que você quer estudar?</h1>
        {available.map((l) => (
          <button key={l} onClick={() => setLang(l)} className="card flex w-full items-center gap-3 p-5 text-left text-lg font-semibold">
            <Flag lang={l} />
            {LANG_LABEL[l]}
          </button>
        ))}
      </div>
    );

  return (
    <div className="space-y-3">
      <h1 className="font-display text-2xl font-bold">Seu nível em {LANG_LABEL[lang].toLowerCase()}</h1>
      {LEVELS.map((l) => (
        <button key={l.id} onClick={() => pick(l.id)} className="card w-full p-4 text-left">
          <div className="font-semibold">{l.name}</div>
          <div className="hint">{l.desc}</div>
        </button>
      ))}
    </div>
  );
}
