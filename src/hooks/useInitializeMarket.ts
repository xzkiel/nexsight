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

export type CreateMarketArgs = {
    title: string;
    description: string;
    category: MarketCategory;
    endTimestamp: number; // Unix seconds
    lockTimestamp?: number; // Defaults to endTimestamp if not provided
    oracleSource: 'Pyth' | 'Switchboard' | 'ManualAdmin';
    oracleFeed?: string; // Optional if ManualAdmin
    oracleThreshold?: number;
    initialLiquidity?: number; 
};

export function useInitializeMarket() {
    const wallet = useWallet();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (args: CreateMarketArgs) => {
            if (!wallet.publicKey || !wallet.signTransaction) throw new Error("Wallet not connected");

            const provider = getProvider(wallet as any);
            if (!provider) throw new Error("Provider not available");

            const program = getProgram(provider);
            const marketId = new BN(Date.now()); // Simple unique ID using timestamp

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
            const adminWsolAta = await getAssociatedTokenAddress(
                collateralMint,
                wallet.publicKey
            );

            const initialLiquiditySOL = args.initialLiquidity || 1; // Default 1 SOL
            const initialLiquidityLamports = Math.round(initialLiquiditySOL * 10 ** COLLATERAL_DECIMALS);

            const preInstructions = [];
            const postInstructions = [];

            // 1. Create wSOL ATA if it doesn't exist
            const wsolAtaInfo = await provider.connection.getAccountInfo(adminWsolAta);
            if (!wsolAtaInfo) {
                preInstructions.push(
                    createAssociatedTokenAccountInstruction(
                        wallet.publicKey,
                        adminWsolAta,
                        wallet.publicKey,
                        collateralMint
                    )
                );
            }

            // 2. Transfer SOL into wSOL ATA
            preInstructions.push(
                SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: adminWsolAta,
                    lamports: initialLiquidityLamports,
                })
            );

            // 3. Sync native balance
            preInstructions.push(
                createSyncNativeInstruction(adminWsolAta)
            );

            // 4. Close wSOL ATA after to reclaim rent
            postInstructions.push(
                createCloseAccountInstruction(
                    adminWsolAta,
                    wallet.publicKey,
                    wallet.publicKey,
                )
            );

            // Params Construction
            // Map string category to IDL enum format using camelCase { "variantName": {} }
            const toCamelCase = (str: string) => {
                return str.charAt(0).toLowerCase() + str.slice(1);
            };

            const categoryArg = { [toCamelCase(args.category)]: {} };
            const oracleSourceArg = { [toCamelCase(args.oracleSource)]: {} };

            // Defaults
            // Backdate start by 60s to ensure "Active" status immediately and pass start < lock
            const startTs = new BN(Math.floor(Date.now() / 1000) - 60);

            // "End Date" from UI is treated as lock_timestamp (betting closes)
            // end_timestamp (resolution allowed) must be > lock_timestamp
            const uiEndTsSeconds = args.endTimestamp;
            const lockTs = args.lockTimestamp ? new BN(args.lockTimestamp) : new BN(uiEndTsSeconds);
            const endTs = new BN(uiEndTsSeconds + 60); // Resolution starts 60s after lock to satisfy lock < end

            // Default dummy feed for manual
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
                maxBet: new BN(100_000_000_000), // 100 SOL
                isRecurring: false,
                roundDuration: null,
                feeBps: 250, // 2.5%
                initialLiquidity: new BN(initialLiquidityLamports),
            };

            const tx = await program.methods.createMarket(
                marketId,
                params as any
            )
                .accounts({
                    adminAta: adminWsolAta,
                })
                .preInstructions(preInstructions)
                .postInstructions(postInstructions)
                .rpc();

            return { tx, marketId: marketId.toString() };
        },
        onSuccess: (data) => {
            toast.success("Market created successfully!");
            console.log("Tx:", data.tx);
            queryClient.invalidateQueries({ queryKey: ['markets'] });
        },
        onError: (error) => {
            console.error(error);
            toast.error("Failed to create market: " + error.message);
        }
    });
}
