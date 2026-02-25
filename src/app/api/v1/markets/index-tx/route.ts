import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/server/services/indexer-singleton';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { signature } = body;

        if (!signature || typeof signature !== 'string' || signature.length < 32) {
            return NextResponse.json({ error: 'Invalid transaction signature' }, { status: 400 });
        }

        const indexer = getIndexer();
        // Small delay to allow the transaction to be confirmed on-chain
        await new Promise(resolve => setTimeout(resolve, 2000));
        await indexer.parseEventsFromTransaction(signature);
        await indexer.syncSingleMarketFromTx(signature).catch(() => {});

        return NextResponse.json({ status: 'ok', signature });
    } catch (err) {
        console.error('Error indexing transaction:', err);
        return NextResponse.json({ error: 'Failed to index transaction' }, { status: 500 });
    }
}
