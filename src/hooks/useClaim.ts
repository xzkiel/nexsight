import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { indexTransaction } from '@/lib/api';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { toast } from 'sonner';
import { COLLATERAL_MINT } from '@/lib/constants';

export function useClaim() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketId,
        }: {
            marketId: string;
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

            const [vault] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), marketPda.toBuffer()],
                program.programId
            );
            const [yesMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("yes_mint"), marketPda.toBuffer()],
                program.programId
            );
            const [noMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("no_mint"), marketPda.toBuffer()],
                program.programId
            );

            const [userPosition] = PublicKey.findProgramAddressSync(
                [Buffer.from("position"), marketPda.toBuffer(), wallet.publicKey.toBuffer()],
                program.programId
            );

            // --- wSOL: create ATA to receive payout, then close to unwrap ---
            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const userWsolAta = await getAssociatedTokenAddress(
                collateralMint,
                wallet.publicKey
            );

            const preInstructions = [];
            const postInstructions = [];

            // Create wSOL ATA if it doesn't exist (to receive payout)
            const wsolAtaInfo = await provider.connection.getAccountInfo(userWsolAta);
            if (!wsolAtaInfo) {
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        userWsolAta,
                        wallet.publicKey,
                        collateralMint
                    )
                );
            }

            // Determine winning share mint from on-chain resolution
            const marketAccount = await program.account.market.fetch(marketPda);
            if (!marketAccount.status.resolved) throw new Error("Market not resolved");

            let targetMint = null;
            if (marketAccount.resolvedOutcome?.yes) targetMint = yesMint;
            else if (marketAccount.resolvedOutcome?.no) targetMint = noMint;
            else throw new Error("Invalid or unset resolution");

            const userShareAta = await getAssociatedTokenAddress(
                targetMint,
                wallet.publicKey
            );

            // After claim, close wSOL ATA to unwrap payout back to native SOL
            postInstructions.push(
                createCloseAccountInstruction(
                    userWsolAta,
                    wallet.publicKey, // destination for lamports (SOL)
                    wallet.publicKey, // owner
                )
            );

            const tx = await program.methods.claimPayout(mid)
                .accounts({
                    userShareAccount: userShareAta,
                    collateralMint,
                })
                .preInstructions(preInstructions)
                .postInstructions(postInstructions)
                .rpc();

            return tx;
        },
        onSuccess: (tx) => {
            toast.success("Payout claimed!");
            indexTransaction(tx);
            queryClient.invalidateQueries({ queryKey: ['markets'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to claim: " + error.message);
        }
    });
}
