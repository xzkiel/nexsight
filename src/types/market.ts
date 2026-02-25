export type MarketStatus = 'pending' | 'active' | 'locked' | 'resolving' | 'resolved' | 'disputed' | 'cancelled' | 'paused';
export type MarketCategory = 'Crypto' | 'Sports' | 'Politics' | 'Entertainment' | 'Weather' | 'Custom';
export type Outcome = 'Yes' | 'No' | 'Invalid';

export interface Market {
    id: string;
    marketId: string; // On-chain ID
    creator: string;
    title: string;
    description: string;
    category: MarketCategory;
    status: MarketStatus;
    image?: string;

    // Token/Vault info
    collateralMint: string;
    yesMint: string;
    noMint: string;
    vault: string;

    // Stats
    totalYesShares: number;
    totalNoShares: number;
    totalCollateral: number;
    volume24h: number;
    participantCount: number;
    feeBps: number;

    // Computed prices (0-100 cents)
    yesPrice: number;
    noPrice: number;

    // Timestamps
    startTimestamp: number;
    lockTimestamp: number; // No more bets
    endTimestamp: number;  // Resolution time

    // Resolution
    oracleSource: 'pyth' | 'switchboard' | 'manualAdmin';
    oracleFeed: string;
    resolvedOutcome?: Outcome;
    resolutionPrice?: number;
}

export interface Bet {
    id: string;
    marketId: string;
    user: string;
    outcome: 'Yes' | 'No';
    amount: number;      // SOL amount
    shares: number;      // Shares received
    price: number;       // Price at execution
    timestamp: number;
    txSignature: string;
}

export interface PricePoint {
    timestamp: number;
    yesPrice: number;
    noPrice: number;
}
