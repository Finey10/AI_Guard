import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zero Latency · ReleaseGuard AI | AO-05 Deployment Risk Advisor',
  description:
    'Real-time error budget tracking, change risk estimation, and AI reliability decision support at the moment of release.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100 selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
