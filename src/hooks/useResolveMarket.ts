import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { indexTransaction } from '@/lib/api';

export function useResolveMarket() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketId,
            outcome, // 'yes' | 'no' | 'invalid'
            oracleSource, // 'pyth' | 'manualAdmin' | 'switchboard'
            pythPriceFeed, // Optional: Pyth price feed address (required for Pyth markets)
        }: {
            marketId: string;
            outcome: 'yes' | 'no' | 'invalid';
            oracleSource?: string;
            pythPriceFeed?: string;
        }) => {
            if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

            const provider = getProvider(wallet as any);
            if (!provider) throw new Error("Provider not available");

            const program = getProgram(provider);
            const mid = new BN(marketId);

            // Derive market PDA
            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), mid.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            const [platformConfig] = PublicKey.findProgramAddressSync(
                [Buffer.from("platform_config")],
                program.programId
            );

            // Convert outcome to enum
            let outcomeArg: { yes: {} } | { no: {} } | { invalid: {} };
            if (outcome === 'yes') {
                outcomeArg = { yes: {} };
            } else if (outcome === 'no') {
                outcomeArg = { no: {} };
            } else {
                outcomeArg = { invalid: {} };
            }

            // Build accounts object
            const accounts: Record<string, PublicKey | null> = {};

            // For Pyth markets, include the price feed account
            if (oracleSource === 'pyth' && pythPriceFeed) {
                accounts.pythPriceFeed = new PublicKey(pythPriceFeed);
            } else {
                accounts.pythPriceFeed = null; // Optional account, pass null if not needed
            }

            const tx = await program.methods.resolveMarket(mid, outcomeArg)
                .accounts(accounts as any)
                .rpc();

            return tx;
        },
        onSuccess: (tx) => {
            toast.success("Market resolved successfully!");
            console.log("Resolve Tx:", tx);
            indexTransaction(tx);
            queryClient.invalidateQueries({ queryKey: ['markets'] });
            queryClient.invalidateQueries({ queryKey: ['market'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to resolve market: " + error.message);
        }
    });
}
