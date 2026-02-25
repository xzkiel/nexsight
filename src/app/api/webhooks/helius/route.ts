import { NextRequest, NextResponse } from 'next/server';
import { getIndexer } from '@/server/services/indexer-singleton';

export async function POST(request: NextRequest) {
    // 1. Signature Verification
    let authHeader = request.headers.get('authorization') || undefined;

    if (authHeader && authHeader.toLowerCase().startsWith('authorization:')) {
        authHeader = authHeader.substring('authorization:'.length).trim();
    }

    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;
    if (webhookSecret) {
        if (authHeader !== webhookSecret) {
            console.warn('Invalid Helius Webhook Secret');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // 2. Payload Validation
    let body: any;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    console.log('Webhook received, payload:', JSON.stringify(body, null, 2).substring(0, 2000));

    let transactions: any[] = [];
    if (Array.isArray(body)) {
        transactions = body;
    } else if (body && typeof body === 'object') {
        transactions = [body];
    } else {
        return NextResponse.json({ error: 'Invalid Payload' }, { status: 400 });
    }

    // 3. Process
    try {
        const indexer = getIndexer();
        await indexer.handleWebhook(transactions);
        return NextResponse.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook Indexer Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
