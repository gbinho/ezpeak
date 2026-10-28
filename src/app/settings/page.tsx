'use client';
import SettingsForm from '@/components/SettingsForm';
import { useApp } from '@/lib/app-context';
import { DEFAULTS, PRESETS } from '@/lib/settings';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const { global, saveGlobal, session } = useApp();
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold">Ajustes</h1>

      <section className="space-y-2">
        <h2 className="label">Presets rápidos</h2>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => saveGlobal(p.values)} className="card p-3 text-left">
              <div className="font-semibold">{p.name}</div>
              <div className="hint">{p.desc}</div>
            </button>
          ))}
        </div>
      </section>

      <SettingsForm scope="global" value={global} onChange={saveGlobal} />

      <section className="card space-y-3 p-4">
        <p className="text-sm text-muted">Conectado como {session?.user.email}</p>
        <button className="btn-ghost w-full" onClick={() => saveGlobal({ ...DEFAULTS, language: global.language, disabledDecks: global.disabledDecks, onboarded: true })}>
          Restaurar padrões
        </button>
        <button className="btn-ghost w-full text-bad" onClick={() => supabase.auth.signOut()}>Sair</button>
      </section>
    </div>
  );
}
