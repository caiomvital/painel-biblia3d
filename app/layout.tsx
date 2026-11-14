import type { Metadata, Viewport } from 'next';
import './globals.css';
import { gameFontVariables } from '@/components/ui/game/fonts';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Bíblia 3D - Painel do Aluno',
  description: 'Plataforma educacional para alunos, professores e diretores da Bíblia 3D com gestão de turmas, aulas, presença e gamificação.',
  applicationName: 'Bíblia 3D',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Bíblia 3D',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Bíblia 3D - Painel do Aluno',
    description: 'Plataforma educacional para alunos, professores e diretores da Bíblia 3D com gestão de turmas, aulas, presença e gamificação.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bíblia 3D - Painel do Aluno',
    description: 'Plataforma educacional para alunos, professores e diretores da Bíblia 3D com gestão de turmas, aulas, presença e gamificação.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`dark ${gameFontVariables}`}>
      <body className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-300" suppressHydrationWarning>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

