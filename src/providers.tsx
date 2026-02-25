'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { useMemo, useState } from 'react';
import { RPC_URL } from '@/lib/constants';


// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';

export function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000,
            },
        },
    }));

    // Custom RPC endpoint with connection config for timeout handling
    const endpoint = useMemo(() => RPC_URL, []);
    const connectionConfig = useMemo(() => ({
        commitment: 'confirmed' as const,
        confirmTransactionInitialTimeout: 30_000,
    }), []);

    // Wallet Standard auto-detects Phantom, Solflare, and other compliant wallets.
    // Manually instantiating adapters (e.g. PhantomWalletAdapter) causes duplicate
    // registration conflicts leading to WalletConnectionError.
    const wallets = useMemo(() => [], []);

    return (
        <QueryClientProvider client={queryClient}>
            <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
                <WalletProvider wallets={wallets} autoConnect>
                    <WalletModalProvider>
                        {children}
                    </WalletModalProvider>
                </WalletProvider>
            </ConnectionProvider>
        </QueryClientProvider>
    );
}
