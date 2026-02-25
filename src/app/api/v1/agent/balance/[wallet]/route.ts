import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getReadOnlyProgram } from '@/services/anchor';
import { RPC_URL } from '@/lib/constants';
import { db } from '@/server/config/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * A2A Agent API — Get wallet balance and positions
 * GET /api/v1/agent/balance/{wallet}
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ wallet: string }> },
) {
    try {
        const { wallet } = await params;
        const pubkey = new PublicKey(wallet);
        const connection = new Connection(RPC_URL, 'confirmed');

        // Get SOL balance
        const balance = await connection.getBalance(pubkey);
        const solBalance = balance / LAMPORTS_PER_SOL;

        // Get positions from DB (joined with market info)
        let positions: any[] = [];
        try {
            const res = await db.query(
                `SELECT 
                    b.market_id,
                    m.title as market_title,
                    m.status,
                    m.resolved_outcome,
                    m.total_collateral,
                    m.total_yes_shares,
                    m.total_no_shares,
                    COALESCE(SUM(CASE WHEN b.outcome = 'Yes' THEN b.shares ELSE 0 END), 0) as yes_shares,
                    COALESCE(SUM(CASE WHEN b.outcome = 'No' THEN b.shares ELSE 0 END), 0) as no_shares,
                    COALESCE(SUM(b.amount), 0) as total_deposited
                FROM bets b
                JOIN markets m ON b.market_id = m.market_id
                WHERE b.user_pubkey = $1
                GROUP BY b.market_id, m.title, m.status, m.resolved_outcome, 
                         m.total_collateral, m.total_yes_shares, m.total_no_shares`,
                [wallet],
            );

            positions = res.rows.map((row: any) => {
                let claimable = 0;
                if (row.status === 'resolved' && row.resolved_outcome) {
                    const isYesWinner = row.resolved_outcome === 'Yes';
                    const userWinningShares = isYesWinner ? parseFloat(row.yes_shares) : parseFloat(row.no_shares);
                    const totalWinningShares = isYesWinner
                        ? parseFloat(row.total_yes_shares)
                        : parseFloat(row.total_no_shares);
                    if (totalWinningShares > 0) {
                        claimable = (userWinningShares / totalWinningShares) * parseFloat(row.total_collateral) / 1e9;
                    }
                }

                return {
                    marketId: row.market_id.toString(),
                    marketTitle: row.market_title,
                    yesShares: row.yes_shares.toString(),
                    noShares: row.no_shares.toString(),
                    totalDeposited: row.total_deposited.toString(),
                    status: row.status,
                    claimable,
                };
            });
        } catch {
            // DB may not have indexed positions — fall back to empty
        }

        return NextResponse.json({
            data: {
                sol: solBalance,
                positions,
            },
        }, { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=5' } });

    } catch (err: any) {
        console.error('[A2A] Error fetching balance:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch balance' },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
