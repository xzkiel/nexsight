import { NextRequest, NextResponse } from 'next/server';
import { MarketService } from '@/server/services/market';

/**
 * A2A Agent API — Get Market Details
 * GET /api/v1/agent/markets/{marketId}
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ marketId: string }> },
) {
    try {
        const { marketId } = await params;
        const market = await MarketService.getById(marketId);

        if (!market) {
            return NextResponse.json(
                { error: 'MARKET_NOT_FOUND', message: `Market ${marketId} not found` },
                { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } },
            );
        }

        return NextResponse.json(
            { data: market },
            {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Cache-Control': 'public, max-age=5',
                },
            },
        );
    } catch (err) {
        console.error('[A2A] Error fetching market:', err);
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: 'Failed to fetch market' },
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
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
