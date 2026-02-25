import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { RPC_URL } from '@/lib/constants';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * A2A Agent API — Submit a signed transaction
 * POST /api/v1/agent/tx/submit
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { signedTransaction } = body;

        if (!signedTransaction) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'signedTransaction (base64) is required' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        const connection = new Connection(RPC_URL, 'confirmed');
        const txBytes = Buffer.from(signedTransaction, 'base64');

        const signature = await connection.sendRawTransaction(txBytes, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
        });

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');

        if (confirmation.value.err) {
            return NextResponse.json({
                signature,
                status: 'failed',
                error: JSON.stringify(confirmation.value.err),
            }, { status: 400, headers: CORS_HEADERS });
        }

        // Index the transaction in our backend (server-side: use absolute URL)
        try {
            const origin = request.headers.get('origin') || request.headers.get('host') || 'http://localhost:3000';
            const baseUrl = origin.startsWith('http') ? origin : `https://${origin}`;
            await fetch(`${baseUrl}/api/v1/markets/index-tx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signature }),
            });
        } catch {
            // Non-critical — indexer will catch it eventually
        }

        return NextResponse.json({
            signature,
            status: 'confirmed',
        }, { headers: CORS_HEADERS });

    } catch (err: any) {
        console.error('[A2A] Error submitting tx:', err);
        return NextResponse.json(
            { error: 'TX_FAILED', message: err.message || 'Transaction submission failed' },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
