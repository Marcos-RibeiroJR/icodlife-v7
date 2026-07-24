// apps/landing/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'iCODLIFE — Sua saúde, conectada do início ao cuidado contínuo',
  description:
    'iCODLIFE é o ecossistema digital de saúde que une pacientes, médicos e clínicas em um único cadastro. Prontuário, exames, telemedicina, ASO e financeiro — tudo integrado.',
  icons: {
    icon: [{ url: '/favicon.ico' }, { url: '/icon-512.png', type: 'image/png', sizes: '512x512' }],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'iCODLIFE — Sua saúde, conectada',
    description:
      'O ecossistema que une pacientes, médicos e clínicas em um único cadastro digital de saúde.',
    url: 'https://icodlife.com.br',
    siteName: 'iCODLIFE',
    locale: 'pt_BR',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
