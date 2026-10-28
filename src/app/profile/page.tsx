'use client';
import { Camera, ChevronRight, Star } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ActivityChart from '@/components/ActivityChart';
import { GoalPath, useGoal } from '@/components/Goal';
import { useApp } from '@/lib/app-context';
import { estimateLevel, GOALS, loadProgress, type Progress } from '@/lib/progress';

/** Reduz a foto para 96px e guarda como data URL nos ajustes. */
function toAvatar(file: File) {
  return new Promise<string>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const size = 96;
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const s = Math.min(img.width, img.height);
      c.getContext('2d')!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      resolve(c.toDataURL('image/jpeg', 0.8));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function ProfilePage() {
  const { global, saveGlobal, decks, session } = useApp();
  const goal = useGoal();
  const [p, setP] = useState<Progress | null>(null);
  const [name, setName] = useState(global.name);
  const file = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProgress(decks, global.language, goal).then(setP);
  }, [decks, global.language, goal]);

  const level = p ? estimateLevel(p.known) : null;
  const fallback = (global.name || session?.user.email || '?')[0].toUpperCase();

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <button onClick={() => file.current?.click()} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-accent-soft" aria-label="Trocar foto">
          {global.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={global.avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="grid h-full place-items-center font-display text-xl font-bold text-accent">{fallback}</span>
          )}
          <span className="absolute right-0 bottom-0 grid h-5 w-5 place-items-center rounded-full bg-ink text-bg"><Camera className="h-3 w-3" /></span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) saveGlobal({ avatar: await toAvatar(f) }); }} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== global.name && saveGlobal({ name: name.trim() })}
          placeholder="Seu nome"
          maxLength={40}
          className="min-w-0 flex-1 bg-transparent font-display text-2xl font-extrabold outline-none placeholder:text-muted"
        />
      </header>

      <div className="grid grid-cols-2 gap-2">
        <Tile n={p?.known ?? '…'} l="palavras" />
        <Tile n={level ?? 'Pré-A1'} l="nível estimado" />
      </div>

      <Link href="/settings?s=goal" className="card block space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Objetivo: {goal} · {GOALS[goal].name}</span>
          <ChevronRight className="h-4 w-4 text-muted" />
        </div>
        {p && <GoalPath known={p.known} goal={goal} />}
      </Link>

      <ActivityChart />

      <Link href="/study?extra=starred" className="flex items-center gap-2 text-sm font-semibold text-accent">
        <Star className="h-4 w-4" /> Revisar cards marcados
      </Link>
    </div>
  );
}

function Tile({ n, l }: { n: string | number; l: string }) {
  return (
    <div className="card p-3">
      <div className="font-display text-xl font-extrabold tabular-nums">{n}</div>
      <div className="text-[11px] leading-tight text-muted">{l}</div>
    </div>
  );
}
