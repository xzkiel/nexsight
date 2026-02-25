import { Market } from '@/types/market';
import { API_URL } from '@/lib/constants';

export async function fetchMarkets(page = 1, limit = 20, category?: string): Promise<Market[]> {
    const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    });
    if (category) params.append('category', category);

    const res = await fetch(`${API_URL}/markets?${params}`);
    if (!res.ok) throw new Error('Failed to fetch markets');

    const json = await res.json();
    return json.data;
}

export async function fetchMarket(id: string): Promise<Market> {
    const res = await fetch(`${API_URL}/markets/${id}`);
    if (!res.ok) {
        if (res.status === 404) throw new Error('Market not found');
        throw new Error('Failed to fetch market');
    }

    const json = await res.json();
    return json.data;
}

export async function fetchMarketHistory(id: string): Promise<{ timestamp: number, yesPrice: number, noPrice: number }[]> {
    const res = await fetch(`${API_URL}/markets/${id}/history`);
    if (!res.ok) throw new Error('Failed to fetch market history');
    const json = await res.json();
    return json.data;
}

/** Notify backend to index a transaction (bet, claim, etc.) by its signature */
export async function indexTransaction(signature: string): Promise<void> {
    try {
        await fetch(`${API_URL}/markets/index-tx`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signature }),
        });
    } catch (err) {
        // Non-critical — the indexer/webhook will eventually catch it
        console.warn('Failed to notify backend of transaction:', err);
    }
}

export interface LeaderboardEntry {
    wallet: string;
    username: string | null;
    avatarUrl: string | null;
    totalVolume: number;
    totalPnl: number;
    totalBets: number;
    winRate: number;
    rankScore: number;
    rank: number;
}

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    const res = await fetch(`${API_URL}/leaderboard?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch leaderboard');
    const json = await res.json();
    return json.data;
}
