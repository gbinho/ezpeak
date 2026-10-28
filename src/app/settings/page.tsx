'use client';
import { useState } from 'react';
import LanguagePicker from '@/components/LanguagePicker';
import SettingsForm from '@/components/SettingsForm';
import { useApp } from '@/lib/app-context';
import { DEFAULTS, LANG_LABEL, LEVELS, type Level } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import type { Lang } from '@/lib/types';

export default function SettingsPage() {
  const { global, saveGlobal, session } = useApp();
  const [adding, setAdding] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const canAdd = global.languages.length < 2;

  const remove = (l: Lang) => {
    const languages = global.languages.filter((x) => x !== l);
    saveGlobal({ languages, language: languages[0] });
  };

  if (adding) return <LanguagePicker onDone={() => setAdding(false)} />;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Ajustes</h1>

      <section className="card divide-y divide-line">
        {global.languages.map((l) => (
          <div key={l} className="flex items-center gap-3 p-4">
            <span className="flex-1 font-semibold">{LANG_LABEL[l]}</span>
            <select
              className="field w-auto py-1.5"
              value={global.levels[l] ?? 'basic'}
              onChange={(e) => {
                const lv = e.target.value as Level;
                saveGlobal({ ...LEVELS.find((x) => x.id === lv)!.values, levels: { ...global.levels, [l]: lv } });
              }}
            >
              {LEVELS.map((lv) => <option key={lv.id} value={lv.id}>{lv.name}</option>)}
            </select>
            {global.languages.length > 1 && <button className="text-muted" aria-label="Remover" onClick={() => remove(l)}>×</button>}
          </div>
        ))}
        {canAdd && <button className="w-full p-4 text-left font-semibold text-accent" onClick={() => setAdding(true)}>+ Adicionar idioma</button>}
      </section>

      <section className="card space-y-4 p-4">
        <Row label="Áudio" on={global.audioOn} onChange={(v) => saveGlobal({ audioOn: v })} />
        <label className="flex items-center justify-between">
          <span className="label">Cards novos por dia</span>
          <input type="number" min={0} max={100} className="field w-20 py-1.5 text-right" value={global.newPerDay} onChange={(e) => e.target.value !== '' && saveGlobal({ newPerDay: +e.target.value })} />
        </label>
      </section>

      <button className="text-sm font-semibold text-muted" onClick={() => setAdvanced(!advanced)}>
        {advanced ? '− Ocultar avançado' : '+ Configurações avançadas'}
      </button>
      {advanced && <SettingsForm scope="global" value={global} onChange={saveGlobal} />}

      <section className="space-y-2 text-sm">
        <p className="text-muted">{session?.user.email}</p>
        <button className="block text-muted" onClick={() => saveGlobal({ ...DEFAULTS, language: global.language, languages: global.languages, levels: global.levels, disabledDecks: global.disabledDecks, onboarded: true })}>
          Restaurar padrões
        </button>
        <button className="block text-bad" onClick={() => supabase.auth.signOut()}>Sair</button>
      </section>
    </div>
  );
}

function Row({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between">
      <span className="label">{label}</span>
      <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
