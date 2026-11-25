import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { GlobalDemoToolbar } from '@/components/shared/global-demo-toolbar';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'FleetFlow — Corporate Vehicle Request & Trip Coordination',
  description: 'Enterprise prototype for company transportation request management and trip coordination.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-background font-sans antialiased flex flex-col`}>
        <GlobalDemoToolbar />
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  );
}

