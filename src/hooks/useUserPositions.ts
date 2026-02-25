import { useQuery } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getReadOnlyProgram } from '@/services/anchor';
import { PublicKey } from '@solana/web3.js';

export interface UserPositionData {
    publicKey: string;
    marketPubkey: string;
    marketId: string;
    marketTitle: string;
    yesShares: number;
    noShares: number;
    totalDeposited: number;
    totalClaimed: number;
    lastBetTimestamp: number;
    // Market context for display
    marketStatus: string;
    resolvedOutcome?: string;
    currentYesPrice: number;
    currentNoPrice: number;
}

export function useUserPositions() {
    const { publicKey } = useWallet();

    return useQuery({
        queryKey: ['userPositions', publicKey?.toBase58()],
        queryFn: async () => {
            if (!publicKey) return [];

            const program = getReadOnlyProgram();

            // Fetch all user positions for this wallet
            const positions = await program.account.userPosition.all([
                {
                    memcmp: {
                        offset: 8, // After discriminator
                        bytes: publicKey.toBase58(),
                    }
                }
            ]);

            if (positions.length === 0) return [];

            // Only fetch the specific markets referenced by user positions (not ALL markets)
            const uniqueMarketPubkeys = [...new Set(positions.map(p => p.account.market.toBase58()))];
            const marketEntries = await Promise.all(
                uniqueMarketPubkeys.map(async (pubkey) => {
                    try {
                        const account = await program.account.market.fetch(pubkey);
                        return [pubkey, account] as const;
                    } catch {
                        return null;
                    }
                })
            );
            const marketMap = new Map(
                marketEntries.filter(Boolean).map(e => [e![0], e![1]])
            );

            const result: UserPositionData[] = [];

            for (const pos of positions) {
                const data = pos.account;
                const marketPubkey = data.market.toBase58();
                const market = marketMap.get(marketPubkey);

                if (!market) continue; // Skip if market not found

                const yesShares = data.yesShares.toNumber() / 1_000_000_000;
                const noShares = data.noShares.toNumber() / 1_000_000_000;
                const totalYesShares = market.totalYesShares.toNumber() / 1_000_000_000;
                const totalNoShares = market.totalNoShares.toNumber() / 1_000_000_000;
                const totalShares = totalYesShares + totalNoShares;

                const yesPrice = totalShares > 0 ? (totalNoShares / totalShares) : 0.5;
                const noPrice = totalShares > 0 ? (totalYesShares / totalShares) : 0.5;

                result.push({
                    publicKey: pos.publicKey.toBase58(),
                    marketPubkey,
                    marketId: market.marketId.toString(),
                    marketTitle: market.title,
                    yesShares,
                    noShares,
                    totalDeposited: data.totalDeposited.toNumber() / 1_000_000_000,
                    totalClaimed: data.totalClaimed.toNumber() / 1_000_000_000,
                    lastBetTimestamp: data.lastBetTimestamp.toNumber() * 1000,
                    marketStatus: Object.keys(market.status)[0],
                    resolvedOutcome: market.resolvedOutcome ? Object.keys(market.resolvedOutcome)[0] : undefined,
                    currentYesPrice: yesPrice,
                    currentNoPrice: noPrice,
                });
            }

            return result;
        },
        enabled: !!publicKey,
    });
}
