import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { toast } from 'sonner';
import { COLLATERAL_MINT, COLLATERAL_DECIMALS } from '@/lib/constants';
import { MarketCategory } from '@/types/market';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { indexTransaction } from '@/lib/api';

export type CreateMarketArgs = {
    title: string;
    description: string;
    category: MarketCategory;
    endTimestamp: number; // Unix seconds
    lockTimestamp?: number;
    oracleSource: 'Pyth' | 'Switchboard' | 'ManualAdmin';
    oracleFeed?: string;
    oracleThreshold?: number;
    initialLiquidity?: number;
};

/**
 * Permissionless market creation — any connected wallet can create a market.
 * Uses the create_market_permissionless instruction (no admin constraint).
 */
export function useCreateMarket() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: CreateMarketArgs) => {
            if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

            const provider = getProvider(wallet as any);
            if (!provider) throw new Error("Provider not available");

            const program = getProgram(provider);
            const marketId = new BN(Date.now());

            // Derivations
            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
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
            const [vault] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), marketPda.toBuffer()],
                program.programId
            );
            const [platformConfig] = PublicKey.findProgramAddressSync(
                [Buffer.from("platform_config")],
                program.programId
            );

            // --- wSOL wrapping for initial liquidity ---
            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const creatorWsolAta = await getAssociatedTokenAddress(
                collateralMint,
                wallet.publicKey
            );

            const initialLiquiditySOL = args.initialLiquidity || 1;
            const initialLiquidityLamports = Math.round(initialLiquiditySOL * 10 ** COLLATERAL_DECIMALS);

            const preInstructions = [];
            const postInstructions = [];

            // 1. Create wSOL ATA if it doesn't exist
            const wsolAtaInfo = await provider.connection.getAccountInfo(creatorWsolAta);
            if (!wsolAtaInfo) {
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        creatorWsolAta,
                        wallet.publicKey,
                        collateralMint
                    )
                );
            }

            // 2. Transfer SOL into wSOL ATA
            preInstructions.push(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: creatorWsolAta,
                    lamports: initialLiquidityLamports,
                })
            );

            // 3. Sync native balance
            preInstructions.push(
                createSyncNativeInstruction(creatorWsolAta)
            );

            // 4. Close wSOL ATA after to reclaim rent
            postInstructions.push(
                createCloseAccountInstruction(
                    creatorWsolAta,
                    wallet.publicKey,
                    wallet.publicKey,
                )
            );

            // Params Construction
            const toCamelCase = (str: string) => {
                return str.charAt(0).toLowerCase() + str.slice(1);
            };

            const categoryArg = { [toCamelCase(args.category)]: {} };
            const oracleSourceArg = { [toCamelCase(args.oracleSource)]: {} };

            // Timestamps
            const startTs = new BN(Math.floor(Date.now() / 1000) - 60);
            const uiEndTsSeconds = args.endTimestamp;
            const lockTs = args.lockTimestamp ? new BN(args.lockTimestamp) : new BN(uiEndTsSeconds);
            const endTs = new BN(uiEndTsSeconds + 60);

            const oracleFeed = args.oracleFeed ? new PublicKey(args.oracleFeed) : PublicKey.default;
            const threshold = new BN(args.oracleThreshold || 0);

            const params = {
                title: args.title,
                description: args.description,
                category: categoryArg,
                oracleSource: oracleSourceArg,
                oracleFeed: oracleFeed,
                oracleThreshold: threshold,
                startTimestamp: startTs,
                lockTimestamp: lockTs,
                endTimestamp: endTs,
                minBet: new BN(10_000_000), // 0.01 SOL
                maxBet: new BN(0), // unlimited
                initialLiquidity: new BN(initialLiquidityLamports),
            };

            const tx = await program.methods.createMarketPermissionless(
                marketId,
                params as any
            )
                .accounts({
                    creatorAta: creatorWsolAta,
                })
                .preInstructions(preInstructions)
                .postInstructions(postInstructions)
                .rpc();

            return { tx, marketId: marketId.toString() };
        },
        onSuccess: (data) => {
            toast.success("Market created successfully!");
            console.log("Tx:", data.tx);
            indexTransaction(data.tx);
            queryClient.invalidateQueries({ queryKey: ['markets'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to create market: " + error.message);
        }
    });
}
