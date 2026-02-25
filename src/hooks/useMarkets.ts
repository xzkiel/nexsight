import { useQuery } from '@tanstack/react-query';
import { fetchMarkets, fetchMarket } from '@/lib/api';
import { Market, MarketStatus, MarketCategory } from '@/types/market';

export function useMarkets(page = 1, category?: string, includeResolved = true) {
    return useQuery({
        queryKey: ['markets', page, category, includeResolved],
        queryFn: async () => {
            // Fetch from Backend API
            let markets = await fetchMarkets(page, 20, category);

            // Client-side filtering for resolved if not handled by API
            if (!includeResolved) {
                markets = markets.filter(m => m.status !== 'resolved');
            }

            return markets;
        }
    });
}

export function useMarket(id: string) {
    return useQuery({
        queryKey: ['market', id],
        queryFn: () => fetchMarket(id),
        enabled: !!id,
        staleTime: 5_000, // 5s - backend caches for 5s anyway
        retry: 2,
    });
}
