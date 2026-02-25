import { NextRequest, NextResponse } from 'next/server';
import { MarketService } from '@/server/services/market';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get('page') || '1');
        const limit = Number(searchParams.get('limit') || '20');
        const category = searchParams.get('category') || undefined;

        const markets = await MarketService.list(page, limit, category);
        return NextResponse.json({ data: markets });
    } catch (err) {
        console.error('Error fetching markets:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
