'use client';
import { useState } from 'react';
import Activity from '@/components/Activity';
import Goal from '@/components/Goal';
import LanguagePicker from '@/components/LanguagePicker';
import SettingsForm from '@/components/SettingsForm';
import { useApp } from '@/lib/app-context';
import { DEFAULTS, LANG_LABEL, LEVELS, type GlobalSettings, type Level } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import { CARD_TYPES, type Lang } from '@/lib/types';

// Cada seção abre sua própria tela. `form` = título do grupo no SettingsForm.
const SECTIONS: { id: string; title: string; form?: string; summary: (g: GlobalSettings) => string }[] = [
  { id: 'langs', title: 'Idiomas e nível', summary: (g) => g.languages.map((l) => LANG_LABEL[l].split(' ')[1]).join(', ') },
  { id: 'goal', title: 'Objetivo', summary: (g) => g.goals[g.language] ?? 'B1' },
  { id: 'pace', title: 'Ritmo diário', form: 'Ritmo diário', summary: (g) => `${g.newPerDay} novos por dia` },
  { id: 'freq', title: 'Frequência dos cards', form: 'Frequência dos cards', summary: (g) => `Retenção ${Math.round(g.retention * 100)}%` },
  { id: 'types', title: 'Tipos de card', form: 'Tipos de card', summary: (g) => `${CARD_TYPES.filter((t) => g.cardTypes[t]).length} ativos` },
  { id: 'hard', title: 'Cards difíceis', form: 'Cards difíceis', summary: (g) => `Após ${g.leechThreshold} erros` },
  { id: 'display', title: 'Exibição e áudio', form: 'Exibição e áudio', summary: (g) => (g.audioOn ? 'Áudio ligado' : 'Áudio desligado') },
  { id: 'session', title: 'Sessão', form: 'Sessão', summary: (g) => (g.sessionMode === 'count' ? `${g.sessionSize} cards` : `${g.sessionMinutes} min`) },
  { id: 'pron', title: 'Avaliação de pronúncia', form: 'Avaliação de pronúncia', summary: (g) => (g.autoGradePronunciation ? 'Nota automática' : 'Manual') },
  { id: 'account', title: 'Conta', summary: () => '' },
];

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 text-muted" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function SettingsPage() {
  const { global, saveGlobal } = useApp();
  // ?s=goal abre uma seção direto (link do Perfil).
  const [open, setOpen] = useState<string | null>(() => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('s')));
  const section = SECTIONS.find((s) => s.id === open);

  if (section)
    return (
      <Activity title={section.title} onBack={() => setOpen(null)}>
        <div className="pt-2">
          {section.id === 'goal' ? <Goal /> : section.id === 'langs' ? <Languages /> : section.id === 'account' ? <Account /> : <SettingsForm scope="global" only={section.form} value={global} onChange={saveGlobal} />}
        </div>
      </Activity>
    );

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold">Ajustes</h1>
      <nav className="card divide-y divide-line overflow-hidden">
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => setOpen(s.id)} className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-surface-2">
            <span className="flex-1 font-semibold">{s.title}</span>
            <span className="text-sm text-muted">{s.summary(global)}</span>
            <Chevron />
          </button>
        ))}
      </nav>
    </div>
  );
}

function Languages() {
  const { global, saveGlobal } = useApp();
  const [adding, setAdding] = useState(false);
  if (adding) return <LanguagePicker onDone={() => setAdding(false)} />;

  const remove = (l: Lang) => {
    const languages = global.languages.filter((x) => x !== l);
    saveGlobal({ languages, language: languages[0] });
  };

  return (
    <div className="card divide-y divide-line">
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
          {global.languages.length > 1 && <button className="px-1 text-muted" aria-label={`Remover ${LANG_LABEL[l]}`} onClick={() => remove(l)}>Remover</button>}
        </div>
      ))}
      {global.languages.length < 2 && <button className="w-full p-4 text-left font-semibold text-accent" onClick={() => setAdding(true)}>Adicionar idioma</button>}
    </div>
  );
}

function Account() {
  const { global, saveGlobal, session } = useApp();
  return (
    <div className="card divide-y divide-line">
      <p className="p-4 text-sm text-muted">{session?.user.email}</p>
      <button
        className="w-full p-4 text-left font-semibold"
        onClick={() => saveGlobal({ ...DEFAULTS, language: global.language, languages: global.languages, levels: global.levels, disabledDecks: global.disabledDecks, onboarded: true })}
      >
        Restaurar padrões
      </button>
      <button className="w-full p-4 text-left font-semibold text-bad" onClick={() => supabase.auth.signOut()}>Sair</button>
    </div>
  );
}
