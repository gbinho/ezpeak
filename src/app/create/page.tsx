'use client';
import Link from 'next/link';
import { useState } from 'react';
import { PlayButton } from '@/components/Audio';
import Respelling from '@/components/Respelling';
import { callAI } from '@/lib/ai';
import { useApp } from '@/lib/app-context';
import { LANG_LABEL } from '@/lib/settings';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/lib/types';

type Draft = Pick<Item, 'text_original' | 'text_romanized' | 'translation_pt' | 'respelling_pt' | 'tip_pt' | 'example' | 'example_pt' | 'kind'>;

const EMPTY: Draft = { text_original: '', text_romanized: null, translation_pt: '', respelling_pt: '', tip_pt: null, example: null, example_pt: null, kind: 'word' };

export default function CreatePage() {
  const { global, decks, session, reloadDecks } = useApp();
  const lang = global.language;
  const [word, setWord] = useState('');
  const [level, setLevel] = useState<'fácil' | 'médio' | 'difícil'>('fácil');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function generate() {
    setBusy(true);
    setMsg(null);
    try {
      setDraft({ ...EMPTY, ...(await callAI<Draft>('generate', { word, level, language: lang })) });
    } catch (e) {
      setMsg((e as Error).message);
    }
    setBusy(false);
  }

  async function save() {
    if (!draft || !session) return;
    setBusy(true);
    let deck = decks.find((d) => d.owner_id === session.user.id && d.language === lang);
    if (!deck) {
      const { data } = await supabase
        .from('decks')
        .insert({ language: lang, title: 'Minhas palavras', theme: 'pessoal', description: 'Cards que você criou.', owner_id: session.user.id, sort_order: 99 })
        .select()
        .single();
      deck = data;
      await reloadDecks();
    }
    const { error } = await supabase.from('items').insert({ ...draft, deck_id: deck!.id, owner_id: session.user.id, sort_order: Date.now() % 1e9 });
    setBusy(false);
    if (error) setMsg(error.message);
    else {
      setMsg(`“${draft.text_original}” salvo em Minhas palavras.`);
      setDraft(null);
      setWord('');
    }
  }

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setDraft((d) => d && { ...d, [k]: e.target.value || null });

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-muted">← Início</Link>
      <h1 className="font-display text-3xl font-extrabold">Criar card</h1>
      <p className="text-muted">Digite uma palavra ou frase, em português ou em {LANG_LABEL[lang].toLowerCase()}. A IA preenche tradução, pronúncia literal e exemplo. Você revisa antes de salvar.</p>
      <form onSubmit={(e) => { e.preventDefault(); generate(); }} className="flex gap-2">
        <input className="field" placeholder='ex.: "cachorro"' value={word} onChange={(e) => setWord(e.target.value)} required />
        <button className="btn-primary shrink-0" disabled={busy}>{busy && !draft ? '…' : '✨ Gerar'}</button>
      </form>
      <div className="flex rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
        {(['fácil', 'médio', 'difícil'] as const).map((l) => (
          <button key={l} onClick={() => setLevel(l)} className={`flex-1 rounded-lg py-2 capitalize ${level === l ? 'bg-accent text-accent-ink' : 'text-muted'}`}>{l}</button>
        ))}
      </div>
      <button className="text-sm font-semibold text-accent" onClick={() => setDraft({ ...EMPTY })}>Ou preencher manualmente</button>
      {msg && <p className="rounded-xl bg-surface-2 p-3 text-sm">{msg}</p>}

      {draft && (
        <div className="card space-y-3 p-4">
          {draft.text_original && (
            <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3">
              <div>
                <div className="font-jp text-2xl font-bold">{draft.text_original}</div>
                {draft.respelling_pt && <Respelling text={draft.respelling_pt} />}
              </div>
              <PlayButton text={draft.text_original} lang={lang} />
            </div>
          )}
          <Field label={LANG_LABEL[lang]} value={draft.text_original} onChange={set('text_original')} />
          {(lang === 'ja' || lang === 'ru') && <Field label="Romanização" value={draft.text_romanized} onChange={set('text_romanized')} />}
          <Field label="Tradução" value={draft.translation_pt} onChange={set('translation_pt')} />
          <Field label="Pronúncia literal (tônica em MAIÚSCULAS)" value={draft.respelling_pt} onChange={set('respelling_pt')} />
          <Field label="Dica de pronúncia" value={draft.tip_pt} onChange={set('tip_pt')} />
          <Field label="Frase de exemplo" value={draft.example} onChange={set('example')} />
          <Field label="Tradução do exemplo" value={draft.example_pt} onChange={set('example_pt')} />
          <button className="btn-primary w-full" disabled={busy || !draft.text_original || !draft.translation_pt || !draft.respelling_pt} onClick={save}>Salvar card</button>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string | null; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="block space-y-1">
      <span className="label">{label}</span>
      <input className="field" value={value ?? ''} onChange={onChange} />
    </label>
  );
}
