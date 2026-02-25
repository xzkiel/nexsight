export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || '/api/ws';
export const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'devnet';
export const RPC_URL = NETWORK === 'mainnet'
    ? process.env.NEXT_PUBLIC__MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com'
    : process.env.NEXT_PUBLIC__DEVNET_RPC_URL || 'https://api.devnet.solana.com';
export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || 'F4JxF7aePgrKKwmVM9tXHUadeTKNLXwFMZFQoiBowLcr';
// wSOL (Wrapped SOL) - used as collateral token
export const COLLATERAL_MINT = 'So11111111111111111111111111111111111111112'; // Native SOL mint (wSOL)
export const COLLATERAL_DECIMALS = 9;
export const COLLATERAL_SYMBOL = 'SOL';

// $NEX token mint address
export const NEXSIGHT_MINT = process.env.NEXT_PUBLIC_NEXSIGHT_MINT || '';

// Admin wallets authorized for platform management (init, resolve, pause)
// Set via env var as comma-separated base58 pubkeys, or hardcode for devnet
export const ADMIN_WALLETS: string[] = (process.env.NEXT_PUBLIC_ADMIN_WALLETS || '')
    .split(',')
    .map(w => w.trim())
    .filter(Boolean);
