'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useApp } from '@/lib/app-context';
import LangSwitcher from './LangSwitcher';
import AIStatus from './AIStatus';
import Login from './Login';

const NAV = [
  { href: '/', label: 'Início', icon: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z' },
  { href: '/practice', label: 'Praticar', icon: 'M12 3v10m0 0a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3zm-7-3a7 7 0 0 0 14 0M12 17v4' },
  { href: '/tutor', label: 'Tutor', icon: 'M4 5h16v11H9l-5 4z' },
  { href: '/profile', label: 'Perfil', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0' },
  { href: '/settings', label: 'Ajustes', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3l2-1-2-4-2 1-2-1V5h-4v2l-2 1-2-1-2 4 2 1v2l-2 1 2 4 2-1 2 1v2h4v-2l2-1 2 1 2-4-2-1z' },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const { session, loading, global, focus } = useApp();
  const path = usePathname();

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') navigator.serviceWorker.register('/sw.js');
  }, []);

  if (loading) return <div className="grid min-h-dvh place-items-center text-muted">Carregando…</div>;
  if (!session) return <Login />;

  const studying = focus || path.startsWith('/study') || !global.languages.length;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <AIStatus />
      {!studying && (
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
            ez<span className="text-accent">peak</span>
          </Link>
          <LangSwitcher />
        </header>
      )}
      <main className={`flex-1 px-4 ${studying ? 'py-3' : 'pt-5 pb-28'}`}>{children}</main>
      {!studying && (
        <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
          <div className="mx-auto grid max-w-2xl grid-cols-5">
            {NAV.map((n) => {
              const active = n.href === '/' ? path === '/' : path.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${active ? 'text-accent' : 'text-muted'}`}>
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <path d={n.icon} />
                  </svg>
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
