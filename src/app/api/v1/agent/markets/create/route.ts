import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createCloseAccountInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { getReadOnlyProgram } from '@/services/anchor';
import { COLLATERAL_MINT, COLLATERAL_DECIMALS, RPC_URL } from '@/lib/constants';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Solana-Pubkey, X-Solana-Signature',
};

/**
 * A2A Agent API — Build a permissionless create_market transaction
 * POST /api/v1/agent/markets/create
 *
 * Any agent can create a market by providing initial liquidity.
 * Returns an unsigned transaction for the agent to sign and submit.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            wallet,
            title,
            description,
            category,
            oracleSource,
            oracleFeed,
            oracleThreshold,
            lockTimestamp,
            endTimestamp,
            initialLiquidity, // SOL
            minBet,
            maxBet,
        } = body;

        // Validate required fields
        if (!wallet || !title || !lockTimestamp || !endTimestamp) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'wallet, title, lockTimestamp, endTimestamp are required' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        if (!initialLiquidity || initialLiquidity < 0.01) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'initialLiquidity must be >= 0.01 SOL' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        if (title.length > 128) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'title must be <= 128 characters' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        const creatorPubkey = new PublicKey(wallet);
        const program = getReadOnlyProgram();
        const connection = new Connection(RPC_URL, 'confirmed');

        // Generate a unique market ID
        const marketId = new BN(Date.now());

        // Derive all PDAs
        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
            program.programId,
        );
        const [yesMint] = PublicKey.findProgramAddressSync(
            [Buffer.from("yes_mint"), marketPda.toBuffer()],
            program.programId,
        );
        const [noMint] = PublicKey.findProgramAddressSync(
            [Buffer.from("no_mint"), marketPda.toBuffer()],
            program.programId,
        );
        const [vault] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), marketPda.toBuffer()],
            program.programId,
        );
        const [platformConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform_config")],
            program.programId,
        );

        const collateralMint = new PublicKey(COLLATERAL_MINT);
        const creatorWsolAta = await getAssociatedTokenAddress(collateralMint, creatorPubkey);

        const liquidityLamports = Math.round((initialLiquidity as number) * 10 ** COLLATERAL_DECIMALS);
        const startTs = Math.floor(Date.now() / 1000) - 60; // Backdate to make active immediately

        // Build category enum arg
        const toCamelCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
        const categoryArg = { [toCamelCase(category || 'Custom')]: {} };
        const oracleSourceArg = { [toCamelCase(oracleSource || 'ManualAdmin')]: {} };

        const params = {
            title,
            description: description || '',
            category: categoryArg,
            oracleSource: oracleSourceArg,
            oracleFeed: oracleFeed ? new PublicKey(oracleFeed) : PublicKey.default,
            oracleThreshold: new BN(oracleThreshold || 0),
            startTimestamp: new BN(startTs),
            lockTimestamp: new BN(lockTimestamp),
            endTimestamp: new BN(endTimestamp),
            minBet: new BN(minBet || 10_000_000), // Default 0.01 SOL
            maxBet: new BN(maxBet || 0), // 0 = unlimited
            initialLiquidity: new BN(liquidityLamports),
        };

        // Build the full transaction with wSOL wrapping
        const tx = new Transaction();

        // Pre: Create wSOL ATA if needed
        const wsolAtaInfo = await connection.getAccountInfo(creatorWsolAta);
        if (!wsolAtaInfo) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    creatorPubkey, creatorWsolAta, creatorPubkey, collateralMint,
                ),
            );
        }

        // Pre: Transfer SOL → wSOL ATA
        tx.add(
            SystemProgram.transfer({
                fromPubkey: creatorPubkey,
                toPubkey: creatorWsolAta,
                lamports: liquidityLamports,
            }),
        );

        // Pre: Sync native balance
        tx.add(createSyncNativeInstruction(creatorWsolAta));

        // Main: create_market_permissionless instruction
        const ix = await program.methods
            .createMarketPermissionless(marketId, params as any)
            .accounts({
                creatorAta: creatorWsolAta,
            })
            .instruction();

        tx.add(ix);

        // Post: Close wSOL ATA to reclaim rent
        tx.add(
            createCloseAccountInstruction(creatorWsolAta, creatorPubkey, creatorPubkey),
        );

        // Set recent blockhash and fee payer
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = creatorPubkey;

        // Serialize as base64 (unsigned)
        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

        return NextResponse.json({
            transaction: serialized.toString('base64'),
            marketId: marketId.toString(),
            marketPda: marketPda.toBase58(),
            initialLiquidity: liquidityLamports,
            expiresAt: Math.floor(Date.now() / 1000) + 120, // ~2 min validity
        }, { headers: CORS_HEADERS });

    } catch (err: any) {
        console.error('[A2A] Error building create market tx:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: err.message || 'Failed to build transaction' },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
