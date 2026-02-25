import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type ActivityType = 'buy-yes' | 'buy-no' | 'claim';

export interface MarketActivity {
    user: string;
    action: string;
    market: string;
    amount: string;
    time: string;
    type: ActivityType;
    signature: string;
}

interface BetRow {
    id: number;
    tx_signature: string;
    market_id: string;
    user_wallet: string;
    outcome: string;
    amount: number;
    shares: number;
    slot: number;
    timestamp: string;
    created_at: string;
}

const PAGE_SIZE = 10;

function formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
}

function betRowToActivity(bet: BetRow, marketTitle?: string): MarketActivity {
    const isYes = bet.outcome.toLowerCase() === 'yes';
    const type: ActivityType = isYes ? 'buy-yes' : 'buy-no';
    const action = isYes ? 'bought YES' : 'bought NO';

    // Amount in DB is in raw units (lamports, 9 decimals for SOL)
    const amountInSol = bet.amount / 1_000_000_000;
    const formattedAmount = `${amountInSol.toFixed(amountInSol < 0.01 ? 4 : 2)} SOL`;

    const userShort = bet.user_wallet.slice(0, 4) + '...' + bet.user_wallet.slice(-4);
    const time = formatTimeAgo(new Date(bet.created_at));

    return {
        user: userShort,
        action,
        market: marketTitle || 'This Market',
        amount: formattedAmount,
        time,
        type,
        signature: bet.tx_signature
    };
}

export function useMarketActivity(marketId: string, marketTitle?: string) {
    const [activities, setActivities] = useState<MarketActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const processedSigs = useRef(new Set<string>());
    const oldestId = useRef<number | null>(null);

    // Fetch initial activities or poll for new ones
    const fetchBets = useCallback(async (isInitial = false) => {
        try {
            let query = supabase
                .from('bets')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            // Filter by market_id unless fetching all activity
            if (marketId && marketId !== 'all') {
                query = query.eq('market_id', marketId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error fetching bets:', error);
                return;
            }

            if (data && data.length > 0) {
                const bets = data as BetRow[];
                const newActivities: MarketActivity[] = [];

                for (const bet of bets) {
                    if (!processedSigs.current.has(bet.tx_signature)) {
                        processedSigs.current.add(bet.tx_signature);
                        newActivities.push(betRowToActivity(bet, marketTitle));
                    }
                }

                if (newActivities.length > 0) {
                    if (isInitial) {
                        setActivities(newActivities);
                        // Track oldest ID for pagination
                        oldestId.current = bets[bets.length - 1].id;
                        setHasMore(bets.length === PAGE_SIZE);
                    } else {
                        // Prepend new activities (realtime/polling updates)
                        setActivities(prev => [...newActivities, ...prev]);
                    }
                    console.log(`Fetched ${newActivities.length} bets`);
                }
            } else if (isInitial) {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to fetch bets:', err);
        } finally {
            if (isInitial) setIsLoading(false);
        }
    }, [marketId, marketTitle]);

    // Load more (older) activities
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore || oldestId.current === null) return;

        setIsLoadingMore(true);
        try {
            let query = supabase
                .from('bets')
                .select('*')
                .lt('id', oldestId.current)
                .order('created_at', { ascending: false })
                .limit(PAGE_SIZE);

            if (marketId && marketId !== 'all') {
                query = query.eq('market_id', marketId);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Error loading more bets:', error);
                return;
            }

            if (data && data.length > 0) {
                const bets = data as BetRow[];
                const moreActivities: MarketActivity[] = [];

                for (const bet of bets) {
                    if (!processedSigs.current.has(bet.tx_signature)) {
                        processedSigs.current.add(bet.tx_signature);
                        moreActivities.push(betRowToActivity(bet, marketTitle));
                    }
                }

                if (moreActivities.length > 0) {
                    setActivities(prev => [...prev, ...moreActivities]);
                    oldestId.current = bets[bets.length - 1].id;
                }
                setHasMore(bets.length === PAGE_SIZE);
            } else {
                setHasMore(false);
            }
        } catch (err) {
            console.error('Failed to load more bets:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [marketId, marketTitle, hasMore, isLoadingMore]);

    useEffect(() => {
        if (!marketId) return;
        // Only run in browser
        if (typeof window === 'undefined') return;

        // Reset state when market changes
        setActivities([]);
        processedSigs.current.clear();
        oldestId.current = null;
        setHasMore(true);
        setIsLoading(true);

        console.log(`Setting up activity for market ${marketId}`);

        // Initial fetch
        fetchBets(true);

        // Poll every 10 seconds for new bets (as backup for realtime)
        const pollInterval = setInterval(() => {
            fetchBets(false);
        }, 10000);

        // Supabase Realtime with filter for this market
        let channel: ReturnType<typeof supabase.channel> | null = null;

        const subscribeTimeout = setTimeout(() => {
            const channelName = `bets-${marketId}`;
            channel = supabase
                .channel(channelName)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'bets',
                        filter: `market_id=eq.${marketId}`
                    },
                    (payload) => {
                        console.log('New bet via Realtime:', payload);
                        const bet = payload.new as BetRow;

                        if (processedSigs.current.has(bet.tx_signature)) return;
                        processedSigs.current.add(bet.tx_signature);

                        const newActivity = betRowToActivity(bet, marketTitle);
                        setActivities(prev => [newActivity, ...prev]);
                    }
                )
                .subscribe((status, err) => {
                    console.log(`Supabase Realtime subscription status: ${status}`, err || '');
                    if (status === 'SUBSCRIBED') {
                        console.log('Realtime connected!');
                    } else if (status === 'TIMED_OUT') {
                        console.warn('Realtime timed out, using polling fallback');
                    } else if (status === 'CHANNEL_ERROR') {
                        console.error('Realtime channel error:', err);
                    }
                });
        }, 500);

        return () => {
            console.log('Cleaning up activity subscription');
            clearInterval(pollInterval);
            clearTimeout(subscribeTimeout);
            if (channel) {
                supabase.removeChannel(channel);
            }
        };
    }, [marketId, marketTitle, fetchBets]);

    return {
        activities,
        isLoading,
        isLoadingMore,
        hasMore,
        loadMore
    };
}
