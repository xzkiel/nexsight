import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createCloseAccountInstruction,
} from '@solana/spl-token';
import { BN } from '@coral-xyz/anchor';
import { getReadOnlyProgram } from '@/services/anchor';
import { COLLATERAL_MINT, RPC_URL } from '@/lib/constants';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * A2A Agent API — Build an unsigned claim payout transaction
 * POST /api/v1/agent/claim/build
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet, marketId } = body;

        if (!wallet || !marketId) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'wallet and marketId are required' },
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

        // Fetch market to determine winning side
        const marketAccount = await program.account.market.fetch(marketPda);
        const resolvedOutcome = marketAccount.resolvedOutcome;

        if (!resolvedOutcome) {
            return NextResponse.json(
                { error: 'MARKET_NOT_RESOLVED', message: 'Market has not been resolved yet' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        // Determine winning mint
        const isYesWinner = 'yes' in resolvedOutcome;
        const winningMint = isYesWinner ? yesMint : noMint;

        const collateralMint = new PublicKey(COLLATERAL_MINT);
        const userWsolAta = await getAssociatedTokenAddress(collateralMint, userPubkey);
        const userShareAccount = await getAssociatedTokenAddress(winningMint, userPubkey);

        // Estimate payout: (userShares / totalWinningShares) * totalCollateral
        let estimatedPayout = 0;
        try {
            const positionAccount = await program.account.userPosition.fetch(userPosition);
            const userShares = isYesWinner
                ? (positionAccount.yesShares as BN)
                : (positionAccount.noShares as BN);
            const totalWinningShares = isYesWinner
                ? (marketAccount.totalYesShares as BN)
                : (marketAccount.totalNoShares as BN);
            const totalCollateral = marketAccount.totalCollateral as BN;

            if (!totalWinningShares.isZero()) {
                estimatedPayout = userShares.mul(totalCollateral).div(totalWinningShares).toNumber() / 1e9;
            }
        } catch {
            // Position may not exist yet — let the on-chain program handle validation
        }

        // Build transaction
        const tx = new Transaction();

        // Create wSOL ATA if needed to receive payout
        const wsolAtaInfo = await connection.getAccountInfo(userWsolAta);
        if (!wsolAtaInfo) {
            tx.add(createAssociatedTokenAccountInstruction(
                userPubkey, userWsolAta, userPubkey, collateralMint,
            ));
        }

        // claim_payout instruction
        const ix = await program.methods
            .claimPayout(mid)
            .accounts({
                userShareAccount,
                collateralMint,
            })
            .instruction();
        tx.add(ix);

        // Close wSOL ATA to unwrap payout to native SOL
        tx.add(createCloseAccountInstruction(userWsolAta, userPubkey, userPubkey));

        // Set blockhash
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        tx.recentBlockhash = blockhash;
        tx.feePayer = userPubkey;

        const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });

        return NextResponse.json({
            transaction: serialized.toString('base64'),
            estimatedPayout,
            winningOutcome: isYesWinner ? 'yes' : 'no',
        }, { headers: CORS_HEADERS });

    } catch (err: any) {
        console.error('[A2A] Error building claim tx:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: err.message || 'Failed to build claim transaction' },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
