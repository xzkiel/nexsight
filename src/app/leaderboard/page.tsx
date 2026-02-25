'use client';

import { cn } from '@/lib/cn';
import { fetchLeaderboard, LeaderboardEntry } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/Skeleton';

function shortenWallet(wallet: string) {
    if (wallet.length <= 10) return wallet;
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
}

function formatSOL(value: number) {
    const abs = Math.abs(value);
    const formatted = abs >= 1000 ? `${(abs / 1000).toFixed(1)}k` : abs.toFixed(2);
    return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

export default function LeaderboardPage() {
    const { data: leaderboard, isLoading, error } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => fetchLeaderboard(50),
        refetchInterval: 30000,
    });

    return (
        <div className="p-5 space-y-5">
            <div>
                <h1 className="text-[18px] font-semibold text-white">Leaderboard</h1>
                <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Top traders by volume, PnL, and win rate</p>
            </div>

            {isLoading && (
                <div className="space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-[56px] w-full rounded-[var(--radius-md)]" />
                    ))}
                </div>
            )}

            {error && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center">
                    <p className="text-[var(--text-secondary)] text-[13px]">Failed to load leaderboard.</p>
                </div>
            )}

            {leaderboard && leaderboard.length === 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center">
                    <p className="text-[var(--text-secondary)] text-[13px]">No traders yet. Be the first!</p>
                </div>
            )}

            {leaderboard && leaderboard.length > 0 && (
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
                    {/* Table header */}
                    <div className="grid grid-cols-[48px_1fr_100px_100px_80px] gap-2 px-4 py-2.5 border-b border-[var(--border)] text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-medium">
                        <span>#</span>
                        <span>Trader</span>
                        <span className="text-right">Volume</span>
                        <span className="text-right hidden sm:block">PnL</span>
                        <span className="text-right hidden sm:block">Trades</span>
                    </div>

                    {/* Rows */}
                    {leaderboard.map((trader) => (
                        <div
                            key={trader.wallet}
                            className={cn(
                                'grid grid-cols-[48px_1fr_100px_100px_80px] gap-2 px-4 py-3 items-center border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors',
                                trader.rank <= 3 && 'bg-[var(--pump-bg)]'
                            )}
                        >
                            <span className="text-[13px] font-medium text-[var(--text-muted)]">
                                {trader.rank <= 3 ? (
                                    <span className={cn(
                                        'inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold',
                                        trader.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                                        trader.rank === 2 ? 'bg-gray-400/20 text-gray-400' :
                                        'bg-orange-600/20 text-orange-500'
                                    )}>
                                        {trader.rank}
                                    </span>
                                ) : (
                                    <span className="text-[var(--text-muted)]">{trader.rank}</span>
                                )}
                            </span>

                            <span className="font-mono text-[13px] text-white truncate">
                                {trader.username || shortenWallet(trader.wallet)}
                            </span>

                            <span className="text-right font-mono text-[13px] text-[var(--text-secondary)]">
                                {trader.totalVolume >= 1000 ? `${(trader.totalVolume / 1000).toFixed(1)}k` : trader.totalVolume.toFixed(2)}
                            </span>

                            <span className={cn(
                                'text-right font-mono text-[13px] hidden sm:block',
                                trader.totalPnl >= 0 ? 'text-[var(--pump-color)]' : 'text-[var(--dump-color)]'
                            )}>
                                {formatSOL(trader.totalPnl)}
                            </span>

                            <span className="text-right font-mono text-[13px] text-[var(--text-secondary)] hidden sm:block">
                                {trader.totalBets}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
