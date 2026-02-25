import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';
import { indexTransaction } from '@/lib/api';

export function useResolve() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketId,
            outcome,
        }: {
            marketId: string;
            outcome: 'yes' | 'no';
        }) => {
            if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

            const provider = getProvider(wallet as any);
            if (!provider) throw new Error("Provider not available");

            const program = getProgram(provider);
            const mid = new BN(marketId);

            // Derivations
            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), mid.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            // Construct outcome argument - enum in Rust IDL
            const outcomeArg = outcome === 'yes' ? { yes: {} } : { no: {} };

            const tx = await program.methods.resolveMarket(
                mid,
                outcomeArg
            )
                .accounts({
                    // @ts-ignore -- Anchor type inference issue, but runtime requires it
                    market: marketPda,
                    // Pass null or a dummy address for optional accounts if Anchor complains about "not provided"
                    // Ideally we pass null, but if strict, we might need a valid pubkey.
                    // Let's try explicit null first, if TS allows, or dummy if not.
                    // The IDL says optional: true.
                    pythPriceFeed: null,
                    // user: wallet.publicKey, (Admin)
                    // systemProgram: SystemProgram.programId,
                })
                .rpc();

            return tx;
        },
        onSuccess: (tx) => {
            toast.success("Market resolved successfully!");
            console.log("Tx:", tx);
            indexTransaction(tx);
            queryClient.invalidateQueries({ queryKey: ['markets'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to resolve market: " + error.message);
        }
    });
}
