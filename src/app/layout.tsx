import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, Noto_Sans_JP } from 'next/font/google';
import Shell from '@/components/Shell';
import { AppProvider } from '@/lib/app-context';
import './globals.css';

const body = DM_Sans({ variable: '--font-body', subsets: ['latin'] });
const display = Bricolage_Grotesque({ variable: '--font-display', subsets: ['latin'] });
const jp = Noto_Sans_JP({ variable: '--font-jp', subsets: ['latin'], weight: ['400', '700'], preload: false });

export const metadata: Metadata = {
  title: 'ezpeak',
  description: 'Aprenda inglês e japonês com flashcards, áudio e pronúncia escrita do jeito que se fala.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'ezpeak', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#e2552d',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${body.variable} ${display.variable} ${jp.variable} antialiased`}>
        <AppProvider>
          <Shell>{children}</Shell>
        </AppProvider>
      </body>
    </html>
  );
}
