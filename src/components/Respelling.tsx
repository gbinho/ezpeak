// Mostra a pronúncia literal com a sílaba tônica (em MAIÚSCULAS) destacada.
export default function Respelling({ text, size = 'lg' }: { text: string; size?: 'md' | 'lg' | 'xl' }) {
  const parts = text.split(/(\s+|-)/);
  const cls = size === 'xl' ? 'text-4xl' : size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className={`font-display font-bold tracking-wide ${cls}`}>
      {parts.map((p, i) => {
        if (p === '-') return <span key={i} className="mx-0.5 text-muted/60">·</span>;
        if (/^\s+$/.test(p)) return <span key={i}> </span>;
        const stressed = p.length > 0 && p === p.toUpperCase() && /\p{L}/u.test(p);
        return (
          <span key={i} className={stressed ? 'text-accent underline decoration-2 underline-offset-4' : 'text-ink/80'}>
            {stressed ? p : p.toLowerCase()}
          </span>
        );
      })}
    </span>
  );
}
