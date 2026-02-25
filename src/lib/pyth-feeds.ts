// Pyth Pull Oracle feed IDs (32-byte hex identifiers, consistent across all networks)
// Source: https://pyth.network/developers/price-feed-ids
// These are NOT Solana account addresses — they are Pyth feed identifiers used with
// the Pyth Pull Oracle (pyth-solana-receiver-sdk / PriceUpdateV2).

import { PublicKey } from '@solana/web3.js';

/** Pyth feed IDs — hex strings (without 0x prefix) */
export const PYTH_FEED_IDS = {
    'SOL/USD': 'ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
    'BTC/USD': 'e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'ETH/USD': 'ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
} as const;

export type PythFeedKey = keyof typeof PYTH_FEED_IDS;

/** Convert a hex feed ID to a Pubkey (for storing in market.oracle_feed) */
export function feedIdToPubkey(hexFeedId: string): PublicKey {
    const bytes = Buffer.from(hexFeedId, 'hex');
    if (bytes.length !== 32) throw new Error(`Invalid feed ID length: ${bytes.length}`);
    return new PublicKey(bytes);
}

/** Convert a Pubkey (from market.oracle_feed) back to a hex feed ID */
export function pubkeyToFeedId(pubkey: PublicKey): string {
    return Buffer.from(pubkey.toBytes()).toString('hex');
}

/** Hermes API endpoint for fetching price update VAAs */
export const HERMES_ENDPOINT = 'https://hermes.pyth.network';

/** Pyth Receiver program on devnet/mainnet */
export const PYTH_RECEIVER_PROGRAM_ID = new PublicKey('rec5EKMGg6MxZYaMdyBps33UmojojGejUhFTBsc8xR2');

/** Feed options for UI dropdowns */
export const PYTH_FEED_OPTIONS: { label: string; value: string; feedId: string }[] = [
    { label: 'SOL/USD', value: feedIdToPubkey(PYTH_FEED_IDS['SOL/USD']).toBase58(), feedId: PYTH_FEED_IDS['SOL/USD'] },
    { label: 'BTC/USD', value: feedIdToPubkey(PYTH_FEED_IDS['BTC/USD']).toBase58(), feedId: PYTH_FEED_IDS['BTC/USD'] },
    { label: 'ETH/USD', value: feedIdToPubkey(PYTH_FEED_IDS['ETH/USD']).toBase58(), feedId: PYTH_FEED_IDS['ETH/USD'] },
];

/**
 * Fetch a price update VAA from Hermes for a given feed ID.
 * Returns the base64-encoded binary update data needed to post on-chain.
 */
export async function fetchHermesPriceUpdate(feedId: string): Promise<{
    binary: { data: string[]; encoding: string };
    parsed: { price: { price: string; expo: number; publish_time: number } }[];
}> {
    const url = `${HERMES_ENDPOINT}/v2/updates/price/latest?ids[]=${feedId}&encoding=base64`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Hermes API error: ${res.status} ${res.statusText}`);
    return res.json();
}

/** Look up which feed label matches a given oracle_feed pubkey */
export function getFeedLabel(oracleFeed: PublicKey | string): string | null {
    const feedHex = typeof oracleFeed === 'string'
        ? oracleFeed
        : pubkeyToFeedId(new PublicKey(oracleFeed));
    for (const [label, id] of Object.entries(PYTH_FEED_IDS)) {
        if (id === feedHex) return label;
    }
    return null;
}
