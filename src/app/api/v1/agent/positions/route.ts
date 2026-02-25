import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/config/db';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * A2A Agent API — Get all positions for a wallet
 * GET /api/v1/agent/positions?wallet=<pubkey>
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const wallet = searchParams.get('wallet');

        if (!wallet) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'wallet query parameter is required' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

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
                    COALESCE(SUM(b.amount), 0) as total_deposited,
                    COALESCE(SUM(CASE WHEN c.id IS NOT NULL THEN c.amount ELSE 0 END), 0) as total_claimed
                FROM bets b
                JOIN markets m ON b.market_id = m.market_id
                LEFT JOIN claims c ON c.market_id = b.market_id AND c.user_pubkey = b.user_pubkey
                WHERE b.user_pubkey = $1
                GROUP BY b.market_id, m.title, m.status, m.resolved_outcome, 
                         m.total_collateral, m.total_yes_shares, m.total_no_shares`,
                [wallet],
            );

            positions = res.rows.map((row: any) => {
                let claimable = 0;
                let currentValue = 0;
                const totalYes = parseFloat(row.total_yes_shares) || 1;
                const totalNo = parseFloat(row.total_no_shares) || 1;
                const totalCollateral = parseFloat(row.total_collateral) || 0;
                const yesShares = parseFloat(row.yes_shares);
                const noShares = parseFloat(row.no_shares);

                if (row.status === 'resolved' && row.resolved_outcome) {
                    const isYesWinner = row.resolved_outcome === 'Yes';
                    const userWinningShares = isYesWinner ? yesShares : noShares;
                    const totalWinningShares = isYesWinner ? totalYes : totalNo;
                    if (totalWinningShares > 0) {
                        claimable = (userWinningShares / totalWinningShares) * totalCollateral / 1e9;
                    }
                } else if (row.status === 'active' || row.status === 'locked') {
                    // Estimate current value using CPMM prices
                    const yesPrice = totalNo / (totalYes + totalNo);
                    const noPrice = totalYes / (totalYes + totalNo);
                    currentValue = (yesShares * yesPrice + noShares * noPrice) / 1e9;
                }

                const totalDeposited = parseFloat(row.total_deposited) / 1e9;
                const pnl = (claimable || currentValue) - totalDeposited;

                return {
                    marketId: row.market_id.toString(),
                    marketTitle: row.market_title,
                    marketStatus: row.status,
                    yesShares: row.yes_shares.toString(),
                    noShares: row.no_shares.toString(),
                    totalDeposited: row.total_deposited.toString(),
                    totalClaimed: row.total_claimed.toString(),
                    claimable,
                    currentValue,
                    pnl,
                };
            });
        } catch {
            // DB may not be available — return empty
        }

        return NextResponse.json(
            { data: positions },
            { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, max-age=10' } },
        );

    } catch (err: any) {
        console.error('[A2A] Error fetching positions:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: err.message || 'Failed to fetch positions' },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
