import { NextRequest, NextResponse } from 'next/server';
import { MarketService } from '@/server/services/market';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const history = await MarketService.getHistory(id);
        return NextResponse.json({ data: history });
    } catch (err) {
        console.error('Error fetching market history:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
