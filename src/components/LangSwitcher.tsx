'use client';
import { Check, ChevronDown, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/lib/app-context';
import { LANG_LABEL } from '@/lib/settings';
import { LANGS } from '@/lib/types';
import Flag from './Flag';

/** Troca o idioma em estudo; tudo no app passa a usar o idioma escolhido. */
export default function LangSwitcher() {
  const { global, saveGlobal } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pr-2.5 pl-2 text-sm font-semibold">
        <Flag lang={global.language} size={22} />
        {LANG_LABEL[global.language]}
        <ChevronDown className={`h-4 w-4 text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="card absolute top-full right-0 z-30 mt-2 w-52 overflow-hidden py-1 shadow-[0_8px_24px_rgb(0_0_0/0.18)]">
          {global.languages.map((l) => (
            <button
              key={l}
              onClick={() => { saveGlobal({ language: l }); setOpen(false); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-2"
            >
              <Flag lang={l} size={22} />
              <span className="flex-1">{LANG_LABEL[l]}</span>
              {l === global.language && <Check className="h-4 w-4 text-accent" />}
            </button>
          ))}
          {global.languages.length < LANGS.length && (
            <Link href="/settings?s=langs" onClick={() => setOpen(false)} className="flex items-center gap-3 border-t border-line px-3 py-2.5 text-sm font-semibold text-accent">
              <Plus className="h-4 w-4" /> Adicionar idioma
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
