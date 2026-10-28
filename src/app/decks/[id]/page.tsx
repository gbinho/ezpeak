'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { PlayButton } from '@/components/Audio';
import Respelling from '@/components/Respelling';
import SettingsForm from '@/components/SettingsForm';
import { useApp } from '@/lib/app-context';
import { formatInterval } from '@/lib/srs';
import { supabase } from '@/lib/supabase';
import { CARD_TYPE_LABEL, type Item, type UserCard } from '@/lib/types';

export default function DeckPage() {
  const { id } = useParams<{ id: string }>();
  const { decks, settingsFor, saveDeck, deckOverrides, session } = useApp();
  const deck = decks.find((d) => d.id === id);
  const [items, setItems] = useState<Item[]>([]);
  const [cards, setCards] = useState<UserCard[]>([]);
  const [tab, setTab] = useState<'cards' | 'config'>('cards');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [{ data: it }, { data: uc }] = await Promise.all([
      supabase.from('items').select('*').eq('deck_id', id).order('sort_order'),
      supabase.from('user_cards').select('*').eq('deck_id', id),
    ]);
    setItems((it as Item[]) ?? []);
    setCards((uc as UserCard[]) ?? []);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!deck) return <p className="text-muted">Carregando…</p>;

  const update = async (uc: UserCard, patch: Partial<UserCard>) => {
    await supabase.from('user_cards').update(patch).match({ user_id: session!.user.id, item_id: uc.item_id, card_type: uc.card_type });
    load();
  };

  const removeItem = async (item: Item) => {
    if (!window.confirm(`Apagar “${item.text_original}” deste deck?`)) return;
    await supabase.from('items').delete().eq('id', item.id);
    load();
  };

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted">← Início</Link>
      <div>
        <h1 className="font-display text-3xl font-extrabold">{deck.title}</h1>
        <p className="text-muted">{deck.description}</p>
      </div>
      <div className="flex gap-2">
        <Link href={`/study?deck=${deck.id}`} className="btn-primary flex-1">Estudar este deck</Link>
      </div>
      <div className="flex rounded-xl border border-line bg-surface p-1">
        {(['cards', 'config'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 rounded-lg py-2 text-sm font-semibold ${tab === t ? 'bg-accent text-accent-ink' : 'text-muted'}`}>
            {t === 'cards' ? `Palavras (${items.length})` : 'Configurações do deck'}
          </button>
        ))}
      </div>

      {tab === 'config' ? (
        <div className="space-y-3">
          <p className="hint">Estas configurações valem só para este deck e substituem os ajustes gerais.</p>
          <SettingsForm scope="deck" value={settingsFor(deck.id)} onChange={(p) => saveDeck(deck.id, p)} />
          {deckOverrides[deck.id] && <button className="btn-ghost w-full" onClick={() => saveDeck(deck.id, null)}>Usar os ajustes gerais</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const ucs = cards.filter((c) => c.item_id === it.id);
            const isOpen = open === it.id;
            return (
              <div key={it.id} className="card p-3">
                <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : it.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="font-jp text-lg font-bold">{it.text_original} {it.text_romanized && <span className="font-sans text-sm font-normal text-muted">{it.text_romanized}</span>}</div>
                    <Respelling text={it.respelling_pt} size="md" />
                    <div className="text-sm text-muted">{it.translation_pt}</div>
                  </div>
                  <span className="chip">{ucs.length ? `${ucs.length} cards` : 'novo'}</span>
                </button>
                {isOpen && (
                  <div className="mt-3 space-y-2 border-t border-line pt-3">
                    <div className="flex items-center gap-2">
                      <PlayButton text={it.text_original} lang={deck.language} />
                      {it.tip_pt && <p className="text-sm">💡 {it.tip_pt}</p>}
                    </div>
                    {ucs.map((c) => (
                      <div key={c.card_type} className="rounded-xl bg-surface-2 p-2.5 text-sm">
                        <div className="flex justify-between font-semibold">
                          <span>{CARD_TYPE_LABEL[c.card_type]}{c.starred && ' ★'}</span>
                          <span className="text-muted">{c.suspended ? 'suspenso' : `volta em ${formatInterval(new Date(c.due))}`}</span>
                        </div>
                        <div className="hint">{c.reps} revisões · {c.lapses} erros · estabilidade {c.stability.toFixed(1)} d</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {[-1, 0, 1].map((p) => (
                            <button key={p} onClick={() => update(c, { priority: p })} className={`chip ${c.priority === p ? 'bg-accent text-accent-ink' : ''}`}>
                              {p === 1 ? 'Mais vezes' : p === -1 ? 'Menos vezes' : 'Normal'}
                            </button>
                          ))}
                          <button onClick={() => update(c, { suspended: !c.suspended })} className="chip">{c.suspended ? 'Reativar' : 'Suspender'}</button>
                          <button onClick={() => update(c, { starred: !c.starred })} className="chip">{c.starred ? 'Tirar ★' : '★'}</button>
                        </div>
                      </div>
                    ))}
                    {it.owner_id && <button className="text-sm text-bad" onClick={() => removeItem(it)}>Apagar palavra</button>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
