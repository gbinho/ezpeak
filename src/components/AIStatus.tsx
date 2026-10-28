'use client';
import { useEffect, useState } from 'react';
import { onProgress, type AIProgress } from '@/lib/local-ai';

/** Barra fina no topo enquanto a IA local é baixada. */
export default function AIStatus() {
  const [p, setP] = useState<AIProgress>(null);
  useEffect(() => {
    const off = onProgress(setP);
    return () => {
      off();
    };
  }, []);
  if (!p) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-40">
      <div className="h-1 bg-surface-2">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${p.pct}%` }} />
      </div>
      <p className="mx-auto mt-2 w-fit rounded-full bg-ink px-3 py-1 text-xs font-semibold text-bg tabular-nums">
        {p.text} · {p.pct}%
      </p>
    </div>
  );
}
