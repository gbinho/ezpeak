import type { Lang } from '@/lib/types';

// Bandeiras do flagcdn.com (domínio público). Emoji de bandeira não aparece no Windows.
const CODE: Record<Lang, string> = { en: 'us', ja: 'jp', ru: 'ru', fr: 'fr' };

export default function Flag({ lang, size = 24 }: { lang: Lang; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/${CODE[lang]}.svg`}
      alt=""
      width={size}
      height={Math.round(size * 0.7)}
      className="shrink-0 rounded-[3px] object-cover ring-1 ring-line"
      style={{ width: size, height: Math.round(size * 0.7) }}
    />
  );
}
