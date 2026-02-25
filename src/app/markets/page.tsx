'use client';

import { MarketCard } from '@/components/market/MarketCard';
import { CreateMarketForm } from '@/components/admin/CreateMarketForm';
import { Skeleton } from '@/components/ui/Skeleton';
import { useMarkets } from '@/hooks/useMarkets';
import { useWallet } from '@solana/wallet-adapter-react';
import { ADMIN_WALLETS } from '@/lib/constants';
import { Search } from '@/components/ui/Icons';
import { useMemo, useState } from 'react';

export default function MarketsPage() {
    const { data: markets, isLoading } = useMarkets(1, undefined, false);
    const { publicKey } = useWallet();
    const [search, setSearch] = useState('');
    const isAdmin = useMemo(() => {
        if (!publicKey) return false;
        return ADMIN_WALLETS.includes(publicKey.toBase58());
    }, [publicKey]);

    const filtered = markets?.filter(m => m.title.toLowerCase().includes(search.toLowerCase())) ?? [];

    return (
        <div className="p-5 space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-[18px] font-semibold text-white">All Markets</h1>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">Browse, create, and trade prediction markets</p>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={14} />
                    <input
                        placeholder="Filter markets..."
                        className="w-full h-9 pl-9 pr-3 bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--pump-border)] transition-colors"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Admin-only market creation */}
            {isAdmin && <CreateMarketForm />}

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-[200px] rounded-[var(--radius-lg)]" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.map((market) => (
                        <MarketCard key={market.id} {...market} />
                    ))}
                </div>
            )}

            {!isLoading && filtered.length === 0 && (
                <div className="p-10 text-center bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                    <p className="text-[var(--text-secondary)] text-sm">No markets found{search && ` for "${search}"`}</p>
                </div>
            )}
        </div>
    );
}
