import { NextRequest, NextResponse } from 'next/server';
import { MarketService } from '@/server/services/market';

/**
 * A2A Agent API — List Markets
 * GET /api/v1/agent/markets?status=active&category=Crypto&limit=20&page=1
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get('page') || '1');
        const limit = Math.min(Number(searchParams.get('limit') || '20'), 100);
        const category = searchParams.get('category') || undefined;
        const status = searchParams.get('status') || 'active';

        const markets = await MarketService.list(page, limit, category);

        // Filter by status if requested (unless 'all')
        const filtered = status === 'all'
            ? markets
            : markets.filter((m: any) => m.status === status);

        return NextResponse.json({
            data: filtered,
            pagination: { page, limit, total: filtered.length },
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Cache-Control': 'public, max-age=5',
            },
        });
    } catch (err) {
        console.error('[A2A] Error listing markets:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Failed to fetch markets' },
            { status: 500 },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, X-Solana-Pubkey, X-Solana-Signature',
        },
    });
}
