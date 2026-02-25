import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export interface BetPlacedEvent {
    marketId: BN;
    user: PublicKey;
    outcome: { yes: {} } | { no: {} };
    amount: BN;
    shares: BN;
    timestamp: BN;
}

export interface MarketResolvedEvent {
    marketId: BN;
    outcome: { yes: {} } | { no: {} } | { invalid: {} };
    resolutionPrice: BN;
    totalCollateral: BN;
}

export interface PayoutClaimedEvent {
    marketId: BN;
    user: PublicKey;
    amount: BN;
    sharesBurned: BN;
}
