import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { indexTransaction } from '@/lib/api';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { toast } from 'sonner';
import { COLLATERAL_MINT } from '@/lib/constants';

export function useClaimPayout() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketId,
            marketPubkey,
            winningOutcome, // 'yes' | 'no'
        }: {
            marketId: string;
            marketPubkey: string;
            winningOutcome: 'yes' | 'no';
        }) => {
            if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

            const provider = getProvider(wallet as any);
            if (!provider) throw new Error("Provider not available");

            const program = getProgram(provider);
            const mid = new BN(marketId);
            const marketKey = new PublicKey(marketPubkey);

            // Derive PDAs
            const [yesMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("yes_mint"), marketKey.toBuffer()],
                program.programId
            );
            const [noMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("no_mint"), marketKey.toBuffer()],
                program.programId
            );
            const [vault] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), marketKey.toBuffer()],
                program.programId
            );
            const [userPosition] = PublicKey.findProgramAddressSync(
                [Buffer.from("position"), marketKey.toBuffer(), wallet.publicKey.toBuffer()],
                program.programId
            );

            // --- wSOL: create ATA to receive payout, then close to unwrap ---
            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const userWsolAta = await getAssociatedTokenAddress(collateralMint, wallet.publicKey);

            const preInstructions = [];
            const postInstructions = [];

            // Create wSOL ATA if needed to receive payout
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

            // Get user's share account for the winning outcome
            const winningMint = winningOutcome === 'yes' ? yesMint : noMint;
            const userShareAccount = await getAssociatedTokenAddress(
                winningMint,
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
                    userShareAccount,
                    collateralMint,
                })
                .preInstructions(preInstructions)
                .postInstructions(postInstructions)
                .rpc();

            return tx;
        },
        onSuccess: (tx) => {
            toast.success("Payout claimed successfully!");
            console.log("Claim Tx:", tx);
            indexTransaction(tx);
            queryClient.invalidateQueries({ queryKey: ['userPositions'] });
            queryClient.invalidateQueries({ queryKey: ['markets'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to claim payout: " + error.message);
        }
    });
}
