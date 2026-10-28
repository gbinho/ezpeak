'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { data, error } =
      mode === 'in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) setMsg(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message);
    else if (mode === 'up' && !data.session) setMsg('Conta criada! Confira seu e-mail para confirmar e depois entre.');
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <h1 className="font-display text-5xl font-extrabold tracking-tight">
        ez<span className="text-accent">peak</span>
      </h1>
      <p className="mt-3 text-lg text-muted">Inglês e japonês com a pronúncia escrita do jeito que se fala.</p>

      <div className="card mt-6 space-y-2 p-4">
        <Example word="Thank you" say="TÉNK-iu" />
        <Example word="ありがとう" say="a-ri-ga-TÔÔ" />
        <Example word="Water" say="UÓ-ter" />
      </div>

      <form onSubmit={submit} className="mt-8 space-y-3">
        <input className="field" type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="field" type="password" required minLength={6} placeholder="Senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'in' ? 'current-password' : 'new-password'} />
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? 'Aguarde…' : mode === 'in' ? 'Entrar' : 'Criar conta'}
        </button>
        {msg && <p className="text-sm text-muted">{msg}</p>}
      </form>
      <button className="mt-4 text-sm font-semibold text-accent" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
        {mode === 'in' ? 'Não tem conta? Criar agora' : 'Já tenho conta'}
      </button>
    </div>
  );
}

function Example({ word, say }: { word: string; say: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="font-jp text-lg font-bold">{word}</span>
      <span className="font-display text-lg font-bold text-accent">{say}</span>
    </div>
  );
}
