'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/cn';
import { ADMIN_WALLETS } from '@/lib/constants';
import {
  LayoutGrid,
  Trophy,
  Briefcase,
  ShieldAlert,
  Bot,
} from 'lucide-react';

const publicNavigation = [
  { name: 'Markets', href: '/markets', icon: LayoutGrid },
  { name: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Agents', href: '/agents', icon: Bot },
];

const adminNavigation = [
  { name: 'Admin', href: '/admin', icon: ShieldAlert },
];

export function Sidebar() {
  const pathname = usePathname();
  const { publicKey } = useWallet();

  const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toBase58());
  const navigation = isAdmin
    ? [...publicNavigation, ...adminNavigation]
    : publicNavigation;

  return (
    <aside className="fixed top-0 left-0 bottom-0 z-40 w-[220px] bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-[var(--border)]">
        <Link href="/" className="flex items-center gap-2.5 group">
          <svg width="24" height="24" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            <defs>
              <linearGradient id="side-prism" x1="0" y1="0" x2="64" y2="64">
                <stop offset="0%" stopColor="#55D292"/>
                <stop offset="100%" stopColor="#9945FF"/>
              </linearGradient>
            </defs>
            <path d="M32 8L56 52H8L32 8Z" stroke="url(#side-prism)" strokeWidth="2.5" fill="none"/>
            <line x1="46" y1="28" x2="56" y2="22" stroke="#55D292" strokeWidth="1.5" opacity="0.8"/>
            <line x1="46" y1="32" x2="58" y2="32" stroke="#6FFFB0" strokeWidth="1.5" opacity="0.6"/>
            <line x1="46" y1="36" x2="56" y2="42" stroke="#9945FF" strokeWidth="1.5" opacity="0.8"/>
          </svg>
          <span className="font-semibold text-[15px] text-white tracking-tight">
            Nex<span className="text-[var(--text-secondary)] font-normal">sight</span>
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-colors',
                isActive
                  ? 'bg-[var(--pump-bg)] text-[var(--pump-color)] border border-[var(--pump-border)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              )}
            >
              <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-[var(--border)]">
        <div className="text-[11px] text-[var(--text-muted)]">
          Built on <span className="text-[var(--sol-purple)] font-medium">Solana</span>
        </div>
      </div>
    </aside>
  );
}
