// apps/web/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '../components/layout/Providers';

export const metadata: Metadata = {
  title: 'IcodLife — Seus Dados Médicos',
  description: 'Plataforma de prontuário médico pessoal. Gratuito, seguro e sempre com você.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
