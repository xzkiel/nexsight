import { z } from 'zod';

const envSchema = z.object({
    DATABASE_URL: z.string().url().describe('PostgreSQL connection string'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    MAINNET_RPC_URL: z.string().url().default('https://api.mainnet-beta.solana.com'),
    DEVNET_RPC_URL: z.string().url().default('https://api.devnet.solana.com'),
    PROGRAM_ID: z.string().min(32),
    ADMIN_WALLET: z.string().optional(),
    HELIUS_WEBHOOK_SECRET: z.string().optional().default('').describe('Secret for Helius Webhook verification'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    throw new Error('Invalid environment variables');
}

const network = process.env.NEXT_PUBLIC_NETWORK || 'devnet';

export const env = {
    ...parsed.data,
    NODE_ENV: process.env.NODE_ENV ?? 'development',
    RPC_URL: network === 'mainnet'
        ? parsed.data.MAINNET_RPC_URL
        : parsed.data.DEVNET_RPC_URL,
};
