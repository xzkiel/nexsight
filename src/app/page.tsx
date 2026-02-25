'use client';

import Link from 'next/link';
import { useMarkets } from '@/hooks/useMarkets';
import { MarketCard } from '@/components/market/MarketCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { TrendingUp, Flame, Bot } from 'lucide-react';

export default function Home() {
  const { data: markets, isLoading } = useMarkets();

  const trendingMarkets = markets?.slice(0, 6) || [];

  return (
    <div className="p-5 space-y-6">
      {/* Stats row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)]">
          <TrendingUp size={14} className="text-[var(--pump-color)]" />
          <span className="text-[12px] text-[var(--text-secondary)]">Total Markets:</span>
          <span className="text-[12px] font-semibold text-white">{markets?.length ?? '—'}</span>
        </div>
        <Link
          href="/agents"
          className="flex items-center gap-2 px-3 py-2 bg-[var(--pump-bg)] border border-[var(--pump-border)] rounded-[var(--radius-md)] hover:bg-[var(--pump-bg-hover)] transition-colors group"
        >
          <Bot size={14} className="text-[var(--pump-color)]" />
          <span className="text-[12px] text-[var(--pump-color)] font-medium">Deploy Your Agent</span>
        </Link>
      </div>

      {/* Trending */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-[var(--pump-color)]" />
          <h2 className="text-[15px] font-semibold text-white">Trending Markets</h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[200px] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trendingMarkets.map((market) => (
              <MarketCard key={market.id} {...market} />
            ))}
          </div>
        )}

        {!isLoading && trendingMarkets.length === 0 && (
          <div className="p-10 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
            <p className="text-[var(--text-secondary)] text-sm">No markets yet. Create one to get started.</p>
          </div>
        )}

        {markets && markets.length > 6 && (
          <div className="text-center pt-2">
            <Link
              href="/markets"
              className="text-[13px] text-[var(--pump-color)] hover:text-[var(--green-bright)] transition-colors font-medium"
            >
              View all markets →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
