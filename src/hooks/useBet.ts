import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createCloseAccountInstruction,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    NATIVE_MINT,
} from "@solana/spl-token";
import { toast } from 'sonner';
import { COLLATERAL_MINT, COLLATERAL_DECIMALS } from '@/lib/constants';
import { indexTransaction } from '@/lib/api';

export function useBet() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            marketId,
            outcome,
            amount, // in SOL
        }: {
            marketId: string;
            outcome: 'yes' | 'no';
            amount: number;
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

            const [platformConfig] = PublicKey.findProgramAddressSync(
                [Buffer.from("platform_config")],
                program.programId
            );

            const platformAccount = await program.account.platformConfig.fetch(platformConfig);

            // --- wSOL wrapping: convert native SOL → wSOL token account ---
            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const userWsolAta = await getAssociatedTokenAddress(
                collateralMint,
                wallet.publicKey
            );

            const amountBn = new BN(Math.round(amount * 10 ** COLLATERAL_DECIMALS)); // 9 decimals for SOL

            // Calculate expected shares for slippage protection
            // Fetch market account to get current pool state
            const marketAccount = await program.account.market.fetch(marketPda);
            const yesPool = (marketAccount as any).totalYesShares as BN;
            const noPool = (marketAccount as any).totalNoShares as BN;
            const feeBps = ((marketAccount as any).feeBps as number) || 200;

            // Use BN arithmetic to avoid floating-point precision loss
            // (yesPool * noPool can exceed Number.MAX_SAFE_INTEGER)
            const fee = amountBn.mul(new BN(feeBps)).div(new BN(10000));
            const netAmt = amountBn.sub(fee);
            const k = yesPool.mul(noPool);

            let expectedShares: BN;
            if (outcome === 'yes') {
                const newNo = noPool.add(netAmt);
                const newYes = k.div(newNo);
                expectedShares = yesPool.sub(newYes);
            } else {
                const newYes = yesPool.add(netAmt);
                const newNo = k.div(newYes);
                expectedShares = noPool.sub(newNo);
            }
            // 2% slippage tolerance to account for integer division rounding
            const minShares = BN.max(new BN(1), expectedShares.mul(new BN(98)).div(new BN(100)));

            const preInstructions = [];
            const postInstructions = [];

            // 1. Create wSOL ATA if it doesn't exist
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

            // 2. Transfer SOL into the wSOL ATA
            preInstructions.push(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: userWsolAta,
                    lamports: amountBn.toNumber(),
                })
            );

            // 3. Sync native balance so SPL token program sees the SOL as wSOL tokens
            preInstructions.push(
                createSyncNativeInstruction(userWsolAta)
            );

            // 4. Create user share ATA if needed
            const targetMint = outcome === 'yes' ? yesMint : noMint;
            const userShareAta = await getAssociatedTokenAddress(
                targetMint,
                wallet.publicKey
            );

            const shareAtaInfo = await provider.connection.getAccountInfo(userShareAta);
            if (!shareAtaInfo) {
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        userShareAta,
                        wallet.publicKey,
                        targetMint
                    )
                );
            }

            // 5. Ensure treasury wSOL ATA exists (it may have been closed if admin bet previously)
            const treasuryKey = platformAccount.treasury as PublicKey;
            const treasuryInfo = await provider.connection.getAccountInfo(treasuryKey);
            if (!treasuryInfo) {
                // Recreate the treasury ATA — derive the owner from platform admin
                const adminKey = platformAccount.admin as PublicKey;
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey, // payer
                        treasuryKey,      // the ATA address
                        adminKey,         // owner of the ATA
                        collateralMint    // mint
                    )
                );
            }

            // 6. After bet, close wSOL ATA to reclaim remaining SOL + rent
            // BUT skip if this user's wSOL ATA is also the treasury (i.e., user is admin)
            const isTreasuryOwner = userWsolAta.equals(treasuryKey);
            if (!isTreasuryOwner) {
                postInstructions.push(
                    createCloseAccountInstruction(
                        userWsolAta,
                        wallet.publicKey, // destination for remaining lamports
                        wallet.publicKey, // owner/authority
                    )
                );
            }

            const outcomeArg = outcome === 'yes' ? { yes: {} } : { no: {} };

            const tx = await program.methods.placeBet(
                mid,
                outcomeArg,
                amountBn,
                minShares
            )
                .accounts({
                    userShareAccount: userShareAta,
                    treasury: platformAccount.treasury,
                    collateralMint, // IDL account name updated from usdcMint
                })
                .preInstructions(preInstructions)
                .postInstructions(postInstructions)
                .rpc();

            return tx;
        },
        onSuccess: (tx) => {
            toast.success("Bet placed successfully!");
            console.log("Tx:", tx);
            // Notify backend to index this transaction and store the bet in DB
            indexTransaction(tx);
            queryClient.invalidateQueries({ queryKey: ['markets'] });
        },
        onError: (error) => {
            console.error(error);
            let message = error.message;
            if (message.includes("0x1") || message.includes("insufficient funds")) {
                message = "Insufficient funds. Please make sure you have enough SOL.";
            }
            toast.error("Failed to place bet: " + message);
        }
    });
}
