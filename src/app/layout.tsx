import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { TrendingMarquee } from '@/components/layout/TrendingMarquee';
import { MobileNav } from '@/components/layout/MobileNav';
import { cn } from '@/lib/cn';
import { Toaster } from 'sonner';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Nexsight - Prediction Markets',
  description: 'Predict the future of crypto on Solana.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        inter.variable,
        "min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] font-[var(--font-body)] antialiased"
      )}>
        <Providers>
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Main area offset by sidebar */}
          <div className="md:ml-[220px] flex flex-col min-h-screen">
            <Suspense fallback={<div className="h-9 w-full bg-[var(--bg-base)] border-b border-[var(--border)] shrink-0" />}>
              <TrendingMarquee />
            </Suspense>
            <TopBar />
            <main className="flex-1 overflow-auto pb-16 md:pb-0">
              {children}
            </main>
          </div>

          {/* Mobile bottom nav */}
          <MobileNav />

          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              unstyled: true,
              classNames: {
                toast: 'flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] w-full md:max-w-[356px] shadow-lg font-[var(--font-body)]',
                title: 'text-[var(--text-primary)] font-medium text-sm',
                description: 'text-[var(--text-secondary)] text-sm',
                actionButton: 'bg-[var(--green)] text-black text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--green-dim)] transition-colors',
                cancelButton: 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-xs font-medium px-3 py-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--bg-card-hover)] transition-colors',
                error: '!border-[var(--dump-border)] !text-[var(--dump-color)]',
                success: '!border-[var(--pump-border)] !text-[var(--pump-color)]',
                warning: '!border-[var(--warning)]/50 !text-[var(--warning)]',
                info: '!border-[var(--info)]/50 !text-[var(--info)]',
              }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
