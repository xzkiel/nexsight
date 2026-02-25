import { NextRequest, NextResponse } from 'next/server';
import { MarketService } from '@/server/services/market';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const market = await MarketService.getById(id);
        if (!market) {
            return NextResponse.json({ error: 'Market not found' }, { status: 404 });
        }
        return NextResponse.json({ data: market });
    } catch (err) {
        console.error('Error fetching market:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
