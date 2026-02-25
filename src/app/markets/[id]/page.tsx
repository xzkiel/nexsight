'use client';

import { useParams } from 'next/navigation';
import { MarketInfo } from '@/components/market/MarketInfo';
import { BetPanel } from '@/components/market/BetPanel';
import { MarketChart } from '@/components/market/MarketChart';
import { RecentBets } from '@/components/market/RecentBets';
import { MarketTabs } from '@/components/market/MarketTabs';
import { useMarket } from '@/hooks/useMarkets';
import { Skeleton } from '@/components/ui/Skeleton';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/Button';

import { ActivityFeed } from '@/components/features/ActivityFeed';

export default function MarketDetailPage() {
    const params = useParams();
    const marketId = params.id as string;
    const { data: market, isLoading, error } = useMarket(marketId);
    const [activeTab, setActiveTab] = useState<'overview' | 'activity'>('overview');

    if (isLoading) {
        return (
            <div className="p-5 space-y-5">
                <Skeleton className="h-8 w-40" />
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                    <div className="lg:col-span-8 space-y-5">
                        <Skeleton className="h-[160px] w-full" />
                        <Skeleton className="h-[300px] w-full" />
                    </div>
                    <div className="lg:col-span-4">
                        <Skeleton className="h-[260px] w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !market) {
        return (
            <div className="p-5 flex items-center justify-center min-h-[60vh]">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-8 text-center max-w-sm">
                    <h2 className="text-[16px] font-semibold text-[var(--dump-color)] mb-3">Market Not Found</h2>
                    <p className="text-[13px] text-[var(--text-secondary)] mb-4">Could not load market data.</p>
                    <Link
                        href="/markets"
                        className={cn(buttonVariants({ variant: 'secondary', size: 'sm' }))}
                    >
                        Back to Markets
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="p-5">
            <Link href="/markets" className="inline-flex items-center text-[var(--text-secondary)] hover:text-white text-[13px] mb-4 transition-colors">
                <ArrowLeft size={14} className="mr-1.5" />
                Markets
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left Column */}
                <div className="lg:col-span-8 space-y-5">
                    <MarketInfo market={market} />
                    <MarketChart marketId={market.id} numericMarketId={market.marketId} yesPrice={market.yesPrice} />

                    <div className="space-y-4">
                        <div className="border-b border-[var(--border)] pb-3">
                            <MarketTabs activeTab={activeTab} onTabChange={setActiveTab} />
                        </div>

                        {activeTab === 'overview' ? (
                            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
                                <div>
                                    <h3 className="text-[14px] font-semibold text-white mb-2">Market Rules</h3>
                                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                                        {market.description}
                                    </p>
                                </div>

                                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)]">
                                    <h4 className="text-[12px] font-semibold text-white mb-1">Resolution Source</h4>
                                    <p className="text-[12px] text-[var(--text-secondary)]">
                                        Resolves via <strong>{market.oracleSource}</strong> oracle feed.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <ActivityFeed marketId={market.marketId} />
                        )}
                    </div>
                </div>

                {/* Right Column: Bet Panel */}
                <div className="lg:col-span-4">
                    <div className="sticky top-[4rem]">
                        <BetPanel market={market} />
                    </div>
                </div>
            </div>
        </div>
    );
}