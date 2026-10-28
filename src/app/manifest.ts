import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ezpeak',
    short_name: 'ezpeak',
    description: 'Inglês e japonês com flashcards e pronúncia escrita do jeito que se fala.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f4ee',
    theme_color: '#e2552d',
    lang: 'pt-BR',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
