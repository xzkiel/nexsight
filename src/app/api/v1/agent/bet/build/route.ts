import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createSyncNativeInstruction,
    createCloseAccountInstruction,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { getReadOnlyProgram } from '@/services/anchor';
import { COLLATERAL_MINT, COLLATERAL_DECIMALS, RPC_URL } from '@/lib/constants';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * A2A Agent API — Build an unsigned bet transaction
 * POST /api/v1/agent/bet/build
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet, marketId, outcome, amount, slippageBps = 200 } = body;

        if (!wallet || !marketId || !outcome || !amount) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'wallet, marketId, outcome, amount are required' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        if (!['yes', 'no'].includes(outcome)) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'outcome must be "yes" or "no"' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        const userPubkey = new PublicKey(wallet);
        const program = getReadOnlyProgram();
        const connection = new Connection(RPC_URL, 'confirmed');
        const mid = new BN(marketId);

        // Derive PDAs
        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), mid.toArrayLike(Buffer, "le", 8)],
            program.programId,
        );
        const [vault] = PublicKey.findProgramAddressSync(
            [Buffer.from("vault"), marketPda.toBuffer()],
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
        const [userPosition] = PublicKey.findProgramAddressSync(
            [Buffer.from("position"), marketPda.toBuffer(), userPubkey.toBuffer()],
            program.programId,
        );
        const [platformConfig] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform_config")],
            program.programId,
        );

        // Fetch on-chain state for CPMM calculation
        const marketAccount = await program.account.market.fetch(marketPda);
        const platformAccount = await program.account.platformConfig.fetch(platformConfig);

        const collateralMint = new PublicKey(COLLATERAL_MINT);
        const userWsolAta = await getAssociatedTokenAddress(collateralMint, userPubkey);
        const targetMint = outcome === 'yes' ? yesMint : noMint;
        const userShareAta = await getAssociatedTokenAddress(targetMint, userPubkey);

        const amountBn = new BN(Math.round(amount * 10 ** COLLATERAL_DECIMALS));

        // Calculate expected shares (CPMM)
        const yesPool = marketAccount.totalYesShares as BN;
        const noPool = marketAccount.totalNoShares as BN;
        const feeBps = (marketAccount.feeBps as number) || 200;

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

        const slippageMul = 10000 - slippageBps;
        const minShares = BN.max(new BN(1), expectedShares.mul(new BN(slippageMul)).div(new BN(10000)));

        // Calculate effective price
        const totalShares = yesPool.add(noPool);
        const effectivePrice = outcome === 'yes'
            ? noPool.toNumber() / totalShares.toNumber()
            : yesPool.toNumber() / totalShares.toNumber();

        // Build transaction
        const tx = new Transaction();

        // wSOL ATA creation if needed
        const wsolAtaInfo = await connection.getAccountInfo(userWsolAta);
        if (!wsolAtaInfo) {
            tx.add(createAssociatedTokenAccountInstruction(
                userPubkey, userWsolAta, userPubkey, collateralMint,
            ));
        }

        // Transfer SOL → wSOL
        tx.add(SystemProgram.transfer({
            fromPubkey: userPubkey,
            toPubkey: userWsolAta,
            lamports: amountBn.toNumber(),
        }));
        tx.add(createSyncNativeInstruction(userWsolAta));

        // Share ATA creation if needed
        const shareAtaInfo = await connection.getAccountInfo(userShareAta);
        if (!shareAtaInfo) {
            tx.add(createAssociatedTokenAccountInstruction(
                userPubkey, userShareAta, userPubkey, targetMint,
            ));
        }

        // Ensure treasury ATA exists
        const treasuryKey = platformAccount.treasury as PublicKey;
        const treasuryInfo = await connection.getAccountInfo(treasuryKey);
        if (!treasuryInfo) {
            const adminKey = platformAccount.admin as PublicKey;
            tx.add(createAssociatedTokenAccountInstruction(
                userPubkey, treasuryKey, adminKey, collateralMint,
            ));
        }

        // place_bet instruction
        const outcomeArg = outcome === 'yes' ? { yes: {} } : { no: {} };
        const ix = await program.methods
            .placeBet(mid, outcomeArg, amountBn, minShares)
            .accounts({
                userShareAccount: userShareAta,
                treasury: platformAccount.treasury,
                collateralMint,
            } as any)
            .instruction();
        tx.add(ix);

        // Close wSOL ATA after bet (skip if user is treasury owner)
        const isTreasuryOwner = userWsolAta.equals(treasuryKey);
        if (!isTreasuryOwner) {
            tx.add(createCloseAccountInstruction(userWsolAta, userPubkey, userPubkey));
        }

        // Set blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;

        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

        return NextResponse.json({
            transaction: serialized.toString('base64'),
            estimatedShares: expectedShares.toString(),
            effectivePrice: Math.round(effectivePrice * 100) / 100,
            minShares: minShares.toString(),
            expiresAt: Math.floor(Date.now() / 1000) + 120,
        }, { headers: CORS_HEADERS });

    } catch (err: any) {
        console.error('[A2A] Error building bet tx:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: err.message || 'Failed to build bet transaction' },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
