'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { cn } from '@/lib/cn';
import { ADMIN_WALLETS } from '@/lib/constants';
import { LayoutGrid, Trophy, Briefcase, ShieldAlert, Bot } from '@/components/ui/Icons';

const publicNavigation = [
  { name: 'Markets', href: '/markets', icon: LayoutGrid },
  { name: 'Board', href: '/leaderboard', icon: Trophy },
  { name: 'Portfolio', href: '/portfolio', icon: Briefcase },
  { name: 'Agents', href: '/agents', icon: Bot },
];

export function MobileNav() {
  const pathname = usePathname();
  const { publicKey } = useWallet();

  const isAdmin = publicKey && ADMIN_WALLETS.includes(publicKey.toBase58());
  const navigation = isAdmin
    ? [...publicNavigation, { name: 'Admin', href: '/admin', icon: ShieldAlert }]
    : publicNavigation;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[var(--bg-sidebar)] border-t border-[var(--border)]">
      <div className="flex items-center justify-around h-14">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 text-[10px] font-medium transition-colors',
                isActive
                  ? 'text-[var(--pump-color)]'
                  : 'text-[var(--text-muted)]'
              )}
            >
              <item.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              {item.name}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
