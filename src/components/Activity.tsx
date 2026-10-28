'use client';
import { useEffect } from 'react';
import { useApp } from '@/lib/app-context';

export function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/**
 * Tela de atividade em foco: só título, voltar e a atividade.
 * `footer` fica preso embaixo, na zona do polegar.
 */
export default function Activity({ title, onBack, children, footer, action, leading }: { title: string; onBack: () => void; children: React.ReactNode; footer?: React.ReactNode; action?: React.ReactNode; leading?: React.ReactNode }) {
  const { setFocus } = useApp();
  useEffect(() => {
    setFocus(true);
    return () => setFocus(false);
  }, [setFocus]);

  return (
    <div className="fixed inset-0 z-20 mx-auto flex max-w-2xl flex-col bg-bg">
      <header className="flex h-14 shrink-0 items-center gap-1 px-2">
        <button onClick={onBack} aria-label="Voltar" className="grid h-11 w-11 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-ink">
          <BackIcon />
        </button>
        {leading}
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-wide text-muted">{title}</h1>
        {action}
      </header>
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-4 pb-4">{children}</div>
      {footer && <div className="shrink-0 space-y-3 border-t border-line bg-bg px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
    </div>
  );
}
