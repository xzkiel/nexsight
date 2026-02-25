import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { getReadOnlyProgram } from '@/services/anchor';
import { RPC_URL } from '@/lib/constants';

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

const HERMES_ENDPOINT = 'https://hermes.pyth.network';

/**
 * A2A Agent API — Build an unsigned oracle resolution transaction
 * POST /api/v1/agent/resolve/build-oracle
 *
 * This is PERMISSIONLESS — any agent can resolve a Pyth-sourced market after end_timestamp.
 * The Pyth oracle determines the outcome, not the caller.
 *
 * The endpoint:
 * 1. Looks up the market to get the oracle feed ID
 * 2. Fetches the latest price from Pyth Hermes
 * 3. Uses @pythnetwork/pyth-solana-receiver to build the price posting + resolve transaction
 * 4. Returns the partially-signed transaction (keypair signers applied, wallet signature needed)
 *
 * Body: { wallet: string, marketId: string }
 * Response: { transactions: string[] (base64), priceInfo: {...}, feedId: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { wallet, marketId } = body;

        if (!wallet || !marketId) {
            return NextResponse.json(
                { error: 'INVALID_PARAMS', message: 'wallet, marketId are required' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        const resolverPubkey = new PublicKey(wallet);
        const program = getReadOnlyProgram();
        const connection = new Connection(RPC_URL, 'confirmed');
        const mid = new BN(marketId);

        // Derive market PDA and fetch market data
        const [marketPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("market"), mid.toArrayLike(Buffer, "le", 8)],
            program.programId,
        );

        const marketAccount = await program.account.market.fetch(marketPda);

        // Validate market state
        const status = Object.keys(marketAccount.status)[0];
        if (status === 'resolved') {
            return NextResponse.json(
                { error: 'ALREADY_RESOLVED', message: 'Market is already resolved' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        const oracleSource = Object.keys(marketAccount.oracleSource)[0];
        if (oracleSource !== 'pyth') {
            return NextResponse.json(
                { error: 'NOT_ORACLE_MARKET', message: 'This market uses manual resolution, not Pyth oracle' },
                { status: 400, headers: CORS_HEADERS },
            );
        }

        // Convert oracle_feed Pubkey to hex feed ID
        const oracleFeedBytes = (marketAccount.oracleFeed as PublicKey).toBytes();
        const feedIdHex = Buffer.from(oracleFeedBytes).toString('hex');

        // Fetch latest price from Hermes
        const hermesUrl = `${HERMES_ENDPOINT}/v2/updates/price/latest?ids[]=0x${feedIdHex}&encoding=base64`;
        const hermesRes = await fetch(hermesUrl);
        if (!hermesRes.ok) {
            return NextResponse.json(
                { error: 'HERMES_ERROR', message: `Hermes API returned ${hermesRes.status}` },
                { status: 502, headers: CORS_HEADERS },
            );
        }
        const hermesData = await hermesRes.json();
        const parsed = hermesData.parsed?.[0];
        if (!parsed) {
            return NextResponse.json(
                { error: 'NO_PRICE_DATA', message: 'No price data returned from Hermes' },
                { status: 502, headers: CORS_HEADERS },
            );
        }

        // Build transaction using PythSolanaReceiver
        const { PythSolanaReceiver } = await import('@pythnetwork/pyth-solana-receiver');

        // Dummy wallet for building — the real signing happens client-side
        const dummyWallet = {
            publicKey: resolverPubkey,
            signTransaction: async <T>(tx: T) => tx,
            signAllTransactions: async <T>(txs: T[]) => txs,
            payer: { publicKey: resolverPubkey } as any,
        };

        const pythReceiver = new PythSolanaReceiver({
            connection,
            wallet: dummyWallet as any,
        });

        const builder = pythReceiver.newTransactionBuilder({
            closeUpdateAccounts: true,
        });

        // Post the Hermes VAA on-chain
        await builder.addPostPriceUpdates(hermesData.binary.data);

        // Add our resolve instruction
        await builder.addPriceConsumerInstructions(
            async (getPriceUpdateAccount: (feedId: string) => PublicKey) => {
                const priceFeedAccount = getPriceUpdateAccount(`0x${feedIdHex}`);

                const ix = await program.methods
                    .resolveMarketOracle(mid)
                    .accounts({
                        pythPriceFeed: priceFeedAccount,
                    } as any)
                    .instruction();

                return [{
                    instruction: ix,
                    signers: [],
                    computeUnits: 200_000,
                }];
            }
        );

        // Build legacy transactions with signers
        const txsWithSigners = builder.buildLegacyTransactions({
            computeUnitPriceMicroLamports: 50_000,
            tightComputeBudget: true,
        });

        // Serialize all transactions as base64 (partially signed with keypair signers)
        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        const serializedTxs: string[] = [];

        for (const { tx, signers } of txsWithSigners) {
            tx.recentBlockhash = blockhash;
            tx.feePayer = resolverPubkey;

            // Partially sign with keypair signers (e.g., PriceUpdateV2 account)
            if (signers.length > 0) {
                tx.partialSign(...signers);
            }

            serializedTxs.push(
                Buffer.from(tx.serialize({ requireAllSignatures: false })).toString('base64')
            );
        }

        return NextResponse.json({
            transactions: serializedTxs,
            feedId: feedIdHex,
            priceInfo: {
                price: parsed.price.price,
                expo: parsed.price.expo,
                publishTime: parsed.price.publish_time,
                conf: parsed.price.conf,
            },
            market: {
                marketId: marketAccount.marketId.toString(),
                title: marketAccount.title,
                oracleThreshold: marketAccount.oracleThreshold.toString(),
                endTimestamp: marketAccount.endTimestamp.toString(),
            },
        }, { status: 200, headers: CORS_HEADERS });

    } catch (error: any) {
        console.error("Resolve build error:", error);
        return NextResponse.json(
            { error: 'BUILD_FAILED', message: error.message },
            { status: 500, headers: CORS_HEADERS },
        );
    }
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
