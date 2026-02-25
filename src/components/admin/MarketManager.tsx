'use client';

import { useState } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { useResolveMarket } from '@/hooks/useResolveMarket';
import { cn } from '@/lib/cn';

export function MarketManager() {
    const { data: markets, isLoading } = useMarkets();
    const { mutate: resolveMarket, isPending } = useResolveMarket();
    const [selectedOutcome, setSelectedOutcome] = useState<Record<string, 'yes' | 'no' | 'invalid'>>({});

    const resolvableMarkets = markets?.filter(m =>
        m.status === 'active' || m.status === 'locked'
    ) ?? [];

    const handleResolve = (marketId: string) => {
        const outcome = selectedOutcome[marketId];
        if (!outcome) return;

        const market = resolvableMarkets.find(m => m.marketId === marketId);
        if (!market) return;

        resolveMarket({
            marketId,
            outcome,
            oracleSource: market.oracleSource,
            pythPriceFeed: market.oracleSource === 'pyth' ? market.oracleFeed : undefined,
        });
    };

    if (isLoading) {
        return <div className="text-center py-8 text-[var(--text-muted)]">Loading markets...</div>;
    }

    if (resolvableMarkets.length === 0) {
        return <div className="text-center py-8 text-[var(--text-muted)]">No markets to resolve</div>;
    }

    return (
        <div className="space-y-3">
            {resolvableMarkets.map(market => (
                <div key={market.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <h3 className="text-[14px] font-semibold text-white line-clamp-2">{market.title}</h3>
                            <div className="text-[12px] text-[var(--text-muted)] mt-1">
                                #{market.marketId} · {market.oracleSource}
                            </div>
                        </div>
                        <span className={cn(
                            "text-[11px] px-2 py-0.5 rounded-[var(--radius-sm)] font-medium uppercase",
                            market.status === 'active' && "bg-[var(--pump-bg)] text-[var(--pump-color)]",
                            market.status === 'locked' && "bg-yellow-500/10 text-yellow-500"
                        )}>
                            {market.status}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[12px] text-[var(--text-muted)]">Resolve as:</span>
                        <button
                            onClick={() => setSelectedOutcome(prev => ({ ...prev, [market.marketId]: 'yes' }))}
                            className={cn(
                                "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
                                selectedOutcome[market.marketId] === 'yes'
                                    ? "bg-[var(--pump-color)] text-black"
                                    : "bg-[var(--pump-bg)] text-[var(--pump-color)] hover:bg-[var(--pump-bg-hover)]"
                            )}
                        >
                            PUMP
                        </button>
                        <button
                            onClick={() => setSelectedOutcome(prev => ({ ...prev, [market.marketId]: 'no' }))}
                            className={cn(
                                "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
                                selectedOutcome[market.marketId] === 'no'
                                    ? "bg-[var(--dump-color)] text-white"
                                    : "bg-[var(--dump-bg)] text-[var(--dump-color)] hover:bg-[var(--dump-bg-hover)]"
                            )}
                        >
                            DUMP
                        </button>
                        <button
                            onClick={() => setSelectedOutcome(prev => ({ ...prev, [market.marketId]: 'invalid' }))}
                            className={cn(
                                "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
                                selectedOutcome[market.marketId] === 'invalid'
                                    ? "bg-[var(--text-muted)] text-black"
                                    : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white"
                            )}
                        >
                            INVALID
                        </button>
                    </div>

                    <button
                        onClick={() => handleResolve(market.marketId)}
                        disabled={!selectedOutcome[market.marketId] || isPending}
                        className="w-full py-2 bg-[var(--pump-color)] hover:bg-[var(--pump-color-hover)] text-black font-semibold text-[13px] rounded-[var(--radius-md)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? "Resolving..." : "Resolve Market"}
                    </button>
                </div>
            ))}
        </div>
    );
}
