import { cn } from '@/lib/cn';

async function getTrendingTokens(): Promise<{ tokens?: any[], error?: string }> {
    const apiKey = process.env.COINGECKO_APIKEY;
    if (!apiKey) return { error: 'No API Key' };

    const baseUrl = 'https://pro-api.coingecko.com';
    const headerKey = 'x-cg-pro-api-key';

    try {
        const url = `${baseUrl}/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=volume_desc&per_page=15&page=2&sparkline=false`;
        const res = await fetch(url, {
            headers: {
                [headerKey]: apiKey
            },
            next: { revalidate: 60 } // Cache for 60 seconds
        });

        if (res.status === 401 || res.status === 403) {
            console.warn('Pro API key rejected, attempting fallback to Demo API...');
            const fallbackUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=volume_desc&per_page=15&page=1&sparkline=false`;
            const fallbackRes = await fetch(fallbackUrl, {
                headers: { 'x-cg-demo-api-key': apiKey },
                next: { revalidate: 60 }
            });
            if (fallbackRes.ok) {
                return { tokens: await fallbackRes.json() };
            }
            return { error: 'Both Pro and Demo API keys were rejected (401/403)' };
        }

        if (!res.ok) {
            console.error('Failed to fetch trending tokens from CoinGecko:', res.status, res.statusText);
            return { error: `CoinGecko API Error: ${res.status} ${res.statusText}` };
        }

        const data = await res.json();
        return { tokens: data };
    } catch (err: any) {
        console.error('Error fetching trending tokens:', err);
        return { error: `Fetch Exception: ${err.message}` };
    }
}

export async function TrendingMarquee() {
    const data = await getTrendingTokens();

    // If API key is missing
    if (Array.isArray(data) && data.length === 0) {
        return <div className="w-full h-9 bg-yellow-500/20 text-yellow-500 border-b border-yellow-500/30 flex items-center justify-center text-xs">⚠️ COINGECKO_APIKEY is missing from .env.local</div>;
    }

    if ('error' in data && data.error) {
        return <div className="w-full h-9 bg-red-500/20 text-red-500 border-b border-red-500/30 flex items-center justify-center text-xs">❌ {data.error}</div>;
    }

    const tokens = data.tokens;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
        return <div className="w-full h-9 bg-yellow-500/20 text-yellow-500 border-b border-yellow-500/30 flex items-center justify-center text-xs">⚠️ No trending tokens found</div>;
    }

    interface TokenData {
        id: string;
        symbol: string;
        name: string;
        image?: string;
        price_change_percentage_24h: number | null;
    }

    // Filter out stablecoins for a more relevant trending list
    const filteredTokens = tokens.filter((t: TokenData) =>
        !['usdt', 'usdc'].includes(t.symbol)
    );

    return (
        <div className="w-full h-9 bg-[var(--bg-base)] border-b border-[var(--border)] flex items-center shrink-0">
            {/* Static "Trending |" part */}
            <div className="flex items-center h-full pl-5 pr-3 bg-[var(--bg-base)] z-10 shrink-0">
                <span className="text-[13px] font-bold text-[var(--text-primary)] mr-3 tracking-wide">Trending</span>
                <span className="text-[var(--text-muted)] text-[13px] font-bold">|</span>
            </div>

            {/* Marquee part */}
            <div className="flex-1 overflow-hidden h-full flex items-center relative mask-image-linear-edges">
                <div className="flex w-max items-center animate-ticker hover:[animation-play-state:paused]">
                    {/* Render two identical sets of items to create a seamless loop */}
                    {[1, 2].map((set) => (
                        <div key={set} className="flex items-center">
                            {filteredTokens.map((token: TokenData) => {
                                const change = token.price_change_percentage_24h ?? 0;
                                const isPositive = change >= 0;
                                const colorClass = isPositive ? 'text-[var(--pump-color)]' : 'text-[var(--dump-color)]';
                                const sign = isPositive ? '+' : '';

                                // Heuristic: keep lowercase if explicitly in list, or if the token name is entirely lowercase
                                const lowercaseList = ['wif', 'michi', 'mutt', 'nub', 'sc', 'tremp', 'boden'];
                                const isNameLowercase = token.name && token.name.toLowerCase() === token.name;
                                const displaySymbol = lowercaseList.includes(token.symbol.toLowerCase()) || isNameLowercase
                                    ? token.symbol.toLowerCase()
                                    : token.symbol.toUpperCase();

                                return (
                                    <div key={`${set}-${token.id}`} className="flex items-center gap-2 mx-5 text-[13px] font-medium tracking-wide">
                                        {token.image && (
                                            <img src={token.image} alt={token.symbol} className="w-4 h-4 rounded-full object-cover" />
                                        )}
                                        <span className="text-[var(--text-secondary)]">${displaySymbol}</span>
                                        <span className={`text-[10px] ${colorClass}`}>{sign}{change.toFixed(2)}%</span>
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
