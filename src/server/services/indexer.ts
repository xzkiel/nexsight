import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { env } from '../config/env';
import { db } from '../config/db';
import { BetPlacedEvent, MarketResolvedEvent, PayoutClaimedEvent } from '../types/events';
import IDL from '@/lib/idl/solana_predict.json';

export class Indexer {
    private connection: Connection;
    private programId: PublicKey;
    private program: Program<any> | null = null;
    private isRunning = false;

    constructor() {
        this.connection = new Connection(env.RPC_URL, 'confirmed');
        try {
            this.programId = new PublicKey(env.PROGRAM_ID);
        } catch {
            console.warn('Invalid PROGRAM_ID in env, indexer disabled');
            this.programId = PublicKey.default;
        }
    }

    async start() {
        if (this.programId.equals(PublicKey.default) || this.isRunning) return;
        this.isRunning = true;

        console.log(`Starting Indexer for program: ${this.programId.toBase58()}`);

        const provider = new AnchorProvider(this.connection, {} as any, {});
        this.program = new Program(IDL as any, provider);

        // Initial Sync
        await this.syncAllMarkets();

        // Poll every 30 seconds for new markets
        setInterval(() => {
            this.syncAllMarkets().catch(err => console.error('Polling Error:', err));
        }, 30000);

        // Listen for BetPlaced events
        this.program.addEventListener('BetPlaced', async (event: any, slot: number, signature: string) => {
            try {
                await this.handleBetPlaced(event, slot, signature);
            } catch (err) {
                console.error('Error handling BetPlaced:', err);
            }
        });

        // Listen for MarketResolved events
        this.program.addEventListener('MarketResolved', async (event: any, slot: number, signature: string) => {
            try {
                await this.handleMarketResolved(event, slot, signature);
            } catch (err) {
                console.error('Error handling MarketResolved:', err);
            }
        });

        // Listen for PayoutClaimed events
        this.program.addEventListener('PayoutClaimed', async (event: any, slot: number, signature: string) => {
            try {
                await this.handlePayoutClaimed(event, slot, signature);
            } catch (err) {
                console.error('Error handling PayoutClaimed:', err);
            }
        });

        console.log('Listening for events and polling markets...');
    }

    private async syncAllMarkets() {
        try {
            console.log('Syncing all markets...');
            const program = this.program as any;
            if (!program) return;
            const markets = await program.account.market.all();

            const WSOL_MINT = 'So11111111111111111111111111111111111111112';
            const filteredMarkets = markets.filter(({ account }: any) =>
                account.collateralMint.toBase58() === WSOL_MINT
            );
            if (filteredMarkets.length !== markets.length) {
                console.log(`Skipping ${markets.length - filteredMarkets.length} old pre-migration market(s)`);
            }

            const client = await db.connect();
            try {
                await client.query('BEGIN');
                for (const { publicKey, account } of filteredMarkets) {
                    const data = account as any;
                    const marketId = data.marketId.toString();

                    await client.query(
                        `INSERT INTO markets (
                            market_id, pubkey, creator, title, description, category, status, 
                            collateral_mint, yes_mint, no_mint, vault, 
                            oracle_source, oracle_feed, oracle_threshold,
                            start_timestamp, lock_timestamp, end_timestamp,
                            total_yes_shares, total_no_shares, total_collateral,
                            volume_24h, min_bet, max_bet, fee_bps, indexed_slot, created_at, updated_at
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7,
                            $8, $9, $10, $11,
                            $12, $13, $14,
                            TO_TIMESTAMP($15), TO_TIMESTAMP($16), TO_TIMESTAMP($17),
                            $18, $19, $20,
                            0, $21, $22, $23, 0, NOW(), NOW()
                        )
                        ON CONFLICT (market_id) DO UPDATE SET
                            status = EXCLUDED.status,
                            total_yes_shares = EXCLUDED.total_yes_shares,
                            total_no_shares = EXCLUDED.total_no_shares,
                            total_collateral = EXCLUDED.total_collateral,
                            updated_at = NOW()`,
                        [
                            marketId, publicKey.toBase58(), data.creator.toBase58(), data.title, data.description,
                            Object.keys(data.category)[0], Object.keys(data.status)[0],
                            data.collateralMint.toBase58(), data.yesMint.toBase58(), data.noMint.toBase58(), data.vault.toBase58(),
                            Object.keys(data.oracleSource)[0], data.oracleFeed.toBase58(), data.oracleThreshold ? data.oracleThreshold.toString() : '0',
                            data.startTimestamp.toNumber(), data.lockTimestamp.toNumber(), data.endTimestamp.toNumber(),
                            data.totalYesShares.toString(), data.totalNoShares.toString(), data.totalCollateral.toString(),
                            data.minBet ? data.minBet.toString() : '1000000',
                            data.maxBet ? data.maxBet.toString() : '1000000000',
                            data.feeBps ? data.feeBps : 0
                        ]
                    );

                    await this.savePriceSnapshot(
                        client,
                        marketId,
                        parseFloat(data.totalYesShares.toString()),
                        parseFloat(data.totalNoShares.toString()),
                        data.totalCollateral.toString(),
                        0
                    );
                }
                await client.query('COMMIT');
                console.log(`Synced ${markets.length} markets.`);
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } catch (err) {
            console.error('Sync failed:', err);
        }
    }

    public async handleWebhook(transactions: any[]) {
        console.log(`handleWebhook: Processing ${transactions.length} transactions`);

        for (const tx of transactions) {
            const signature = tx.signature;

            console.log('Webhook TX:', {
                signature,
                type: tx.type,
                hasEvents: !!tx.events,
                eventKeys: tx.events ? Object.keys(tx.events) : [],
            });

            if (!signature) {
                console.log('No signature in transaction, skipping...');
                continue;
            }

            try {
                await this.parseEventsFromTransaction(signature);
            } catch (err) {
                console.error('Error parsing events from transaction:', err);
            }
        }
    }

    public async parseEventsFromTransaction(signature: string) {
        const txResponse = await this.connection.getTransaction(signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
        });

        if (!txResponse?.meta?.logMessages) {
            console.log(`No logs found for tx ${signature}`);
            return;
        }

        const logs = txResponse.meta.logMessages;
        const slot = txResponse.slot;

        for (const log of logs) {
            if (log.startsWith('Program data:')) {
                const base64Data = log.replace('Program data: ', '');

                try {
                    const buffer = Buffer.from(base64Data, 'base64');
                    const discriminator = buffer.slice(0, 8);

                    // BetPlaced discriminator
                    const betPlacedDiscriminator = Buffer.from([88, 88, 145, 226, 126, 206, 32, 0]);
                    if (discriminator.equals(betPlacedDiscriminator)) {
                        console.log(`Found BetPlaced event in tx ${signature}`);

                        const marketId = buffer.readBigUInt64LE(8);
                        const user = new PublicKey(buffer.slice(16, 48));
                        const outcomeValue = buffer.readUInt8(48);
                        const amount = buffer.readBigUInt64LE(49);
                        const shares = buffer.readBigUInt64LE(57);
                        const newYesTotal = buffer.readBigUInt64LE(65);
                        const newNoTotal = buffer.readBigUInt64LE(73);
                        const timestamp = buffer.readBigInt64LE(81);

                        const eventData = {
                            marketId: new BN(marketId.toString()),
                            user,
                            outcome: outcomeValue === 0 ? { yes: {} } : { no: {} },
                            amount: new BN(amount.toString()),
                            shares: new BN(shares.toString()),
                            newYesTotal: new BN(newYesTotal.toString()),
                            newNoTotal: new BN(newNoTotal.toString()),
                            timestamp: new BN(timestamp.toString()),
                        };

                        console.log('Parsed BetPlaced event:', {
                            marketId: marketId.toString(),
                            user: user.toBase58(),
                            outcome: outcomeValue === 0 ? 'Yes' : 'No',
                            amount: (Number(amount) / 1_000_000_000).toFixed(4),
                        });

                        await this.handleBetPlaced(eventData, slot, signature);
                    }

                    // MarketResolved discriminator
                    const marketResolvedDiscriminator = Buffer.from([89, 67, 230, 95, 143, 106, 199, 202]);
                    if (discriminator.equals(marketResolvedDiscriminator)) {
                        console.log(`Found MarketResolved event in tx ${signature}`);

                        const marketId = buffer.readBigUInt64LE(8);
                        const outcomeValue = buffer.readUInt8(16);
                        const resolutionPrice = buffer.readBigInt64LE(17);
                        const totalCollateral = buffer.readBigUInt64LE(25);

                        const outcomeMap: Record<number, string> = { 0: 'Yes', 1: 'No', 2: 'Invalid' };
                        console.log('Parsed MarketResolved event:', {
                            marketId: marketId.toString(),
                            outcome: outcomeMap[outcomeValue] || 'Unknown',
                            resolutionPrice: resolutionPrice.toString(),
                            totalCollateral: (Number(totalCollateral) / 1_000_000_000).toFixed(4),
                        });

                        const eventData: MarketResolvedEvent = {
                            marketId: new BN(marketId.toString()),
                            outcome: outcomeValue === 0 ? { yes: {} } : outcomeValue === 1 ? { no: {} } : { invalid: {} },
                            resolutionPrice: new BN(resolutionPrice.toString()),
                            totalCollateral: new BN(totalCollateral.toString()),
                        };

                        await this.handleMarketResolved(eventData, slot, signature);
                    }

                    // PayoutClaimed discriminator
                    const payoutClaimedDiscriminator = Buffer.from([200, 39, 105, 112, 116, 63, 58, 149]);
                    if (discriminator.equals(payoutClaimedDiscriminator)) {
                        console.log(`Found PayoutClaimed event in tx ${signature}`);

                        const marketId = buffer.readBigUInt64LE(8);
                        const user = new PublicKey(buffer.slice(16, 48));
                        const amount = buffer.readBigUInt64LE(48);
                        const sharesBurned = buffer.readBigUInt64LE(56);

                        console.log('Parsed PayoutClaimed event:', {
                            marketId: marketId.toString(),
                            user: user.toBase58(),
                            amount: (Number(amount) / 1_000_000_000).toFixed(4),
                            sharesBurned: (Number(sharesBurned) / 1_000_000_000).toFixed(4),
                        });

                        const eventData: PayoutClaimedEvent = {
                            marketId: new BN(marketId.toString()),
                            user,
                            amount: new BN(amount.toString()),
                            sharesBurned: new BN(sharesBurned.toString()),
                        };

                        await this.handlePayoutClaimed(eventData, slot, signature);
                    }
                } catch (err) {
                    console.log('Failed to parse event data:', err);
                }
            }
        }
    }

    private async handleBetPlaced(event: BetPlacedEvent, slot: number, signature: string) {
        const marketId = (event.marketId || (event as any).market_id).toString();
        const userPubkey = event.user || (event as any).userId || (event as any).user_id;
        const user = typeof userPubkey === 'string' ? userPubkey : userPubkey.toBase58();

        let outcomeStr = 'Unknown';
        if (typeof event.outcome === 'string') {
            outcomeStr = event.outcome;
        } else if (typeof event.outcome === 'object') {
            outcomeStr = 'yes' in event.outcome || 'Yes' in event.outcome ? 'Yes' : 'No';
        }

        const amount = typeof event.amount === 'number' ? event.amount.toString() : event.amount.toString();
        const shares = typeof event.shares === 'number' ? event.shares.toString() : event.shares.toString();

        console.log(`Processing Bet: ${outcomeStr} on Market ${marketId} by ${user}`);

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO bets (
                tx_signature, market_id, user_wallet, outcome, amount, shares, fee_paid, slot, timestamp
            ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, NOW())
            ON CONFLICT (tx_signature) DO NOTHING`,
                [signature, marketId, user, outcomeStr, amount, shares, slot]
            );

            await client.query(
                `UPDATE markets SET volume_24h = volume_24h + $1, updated_at = NOW() WHERE market_id = $2`,
                [amount, marketId]
            );

            await client.query(
                `INSERT INTO users (wallet, total_bets, total_volume, first_seen, updated_at, rank_score)
                 VALUES ($1, 1, $2, NOW(), NOW(), $2 * 0.3)
                 ON CONFLICT (wallet) DO UPDATE SET
                    total_bets = users.total_bets + 1,
                    total_volume = users.total_volume + $2,
                    rank_score = (users.total_pnl * 0.5) + ((users.total_volume + $2) * 0.3) + (users.win_rate * (users.total_bets + 1) * 200),
                    updated_at = NOW()`,
                [user, amount]
            );

            const marketRes = await client.query('SELECT pubkey FROM markets WHERE market_id = $1', [marketId]);
            if (marketRes.rows.length > 0) {
                const pubkeyStr = marketRes.rows[0].pubkey;
                try {
                    const program = this.program as any;
                    const marketAccount = await program?.account.market.fetch(new PublicKey(pubkeyStr));

                    if (marketAccount) {
                        const m = marketAccount;

                        await client.query(
                            `UPDATE markets SET 
                                total_yes_shares = $1, 
                                total_no_shares = $2, 
                                total_collateral = $3,
                                updated_at = NOW()
                            WHERE market_id = $4`,
                            [m.totalYesShares.toString(), m.totalNoShares.toString(), m.totalCollateral.toString(), marketId]
                        );

                        await this.savePriceSnapshot(
                            client,
                            marketId,
                            parseFloat(m.totalYesShares.toString()),
                            parseFloat(m.totalNoShares.toString()),
                            m.totalCollateral.toString(),
                            slot
                        );
                    }
                } catch (err) {
                    console.error('Error fetching market account in handleBetPlaced:', err);
                }
            }

            await client.query('COMMIT');
            console.log(`Indexed Bet ${signature}`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    private async handleMarketResolved(event: MarketResolvedEvent, slot: number, signature: string) {
        const marketId = (event.marketId || (event as any).market_id).toString();

        let outcomeStr = 'Unknown';
        if (typeof event.outcome === 'string') {
            outcomeStr = event.outcome;
        } else if (typeof event.outcome === 'object') {
            if ('yes' in event.outcome || 'Yes' in event.outcome) outcomeStr = 'Yes';
            else if ('no' in event.outcome || 'No' in event.outcome) outcomeStr = 'No';
            else if ('invalid' in event.outcome || 'Invalid' in event.outcome) outcomeStr = 'Invalid';
        }

        const resolutionPrice = typeof event.resolutionPrice === 'number'
            ? event.resolutionPrice.toString()
            : (event.resolutionPrice || (event as any).resolution_price).toString();

        console.log(`Processing MarketResolved: Market ${marketId} -> ${outcomeStr}`);

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `UPDATE markets SET 
                    status = 'resolved',
                    resolved_outcome = $1,
                    resolution_price = $2,
                    resolved_at = NOW(),
                    updated_at = NOW()
                WHERE market_id = $3`,
                [outcomeStr, resolutionPrice.toString(), marketId]
            );

            await client.query('COMMIT');
            console.log(`Indexed MarketResolved: Market ${marketId} -> ${outcomeStr} (sig: ${signature})`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    private async handlePayoutClaimed(event: PayoutClaimedEvent, slot: number, signature: string) {
        const marketId = (event.marketId || (event as any).market_id).toString();
        const userPubkey = event.user || (event as any).user_id;
        const user = typeof userPubkey === 'string' ? userPubkey : userPubkey.toBase58();
        const amountRaw = typeof event.amount === 'number' ? event.amount.toString() : event.amount.toString();
        const sharesBurnedRaw = typeof event.sharesBurned === 'number'
            ? event.sharesBurned.toString()
            : ((event as any).sharesBurned || (event as any).shares_burned).toString();

        console.log(`Processing PayoutClaimed: Market ${marketId}, User ${user}, Amount ${(parseInt(amountRaw) / 1_000_000_000).toFixed(4)} SOL`);

        const client = await db.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                `INSERT INTO claims (tx_signature, market_id, user_wallet, amount, shares_burned, slot, timestamp)
                 VALUES ($1, $2, $3, $4, $5, $6, NOW())
                 ON CONFLICT (tx_signature) DO NOTHING`,
                [signature, marketId, user, amountRaw, sharesBurnedRaw, slot]
            );

            const betsResult = await client.query(
                `SELECT COALESCE(SUM(amount), 0) as total_bet_amount
                 FROM bets
                 WHERE market_id = $1 AND user_wallet = $2`,
                [marketId, user]
            );
            const totalBetAmount = parseInt(betsResult.rows[0].total_bet_amount || '0');
            const pnl = parseInt(amountRaw) - totalBetAmount;
            const isWin = pnl > 0 ? 1 : 0;

            const userResult = await client.query(
                `SELECT total_bets, total_pnl, total_volume, win_rate FROM users WHERE wallet = $1`,
                [user]
            );

            if (userResult.rows.length > 0) {
                const currentUser = userResult.rows[0];
                const currentTotalBets = parseInt(currentUser.total_bets || '0');
                const currentWinRate = parseFloat(currentUser.win_rate || '0');
                const currentPnl = parseInt(currentUser.total_pnl || '0');
                const currentVolume = parseInt(currentUser.total_volume || '0');

                const currentWins = Math.round((currentWinRate * currentTotalBets) / 100);
                const newWins = currentWins + isWin;
                const newWinRate = currentTotalBets > 0 ? (newWins / currentTotalBets) * 100 : 0;
                const newPnl = currentPnl + pnl;

                const newRankScore = (newPnl * 0.5) + (currentVolume * 0.3) + (newWinRate * currentTotalBets * 200);

                await client.query(
                    `UPDATE users SET
                        total_pnl = $1,
                        win_rate = $2,
                        rank_score = $3,
                        updated_at = NOW()
                    WHERE wallet = $4`,
                    [newPnl.toString(), newWinRate.toFixed(2), Math.floor(newRankScore).toString(), user]
                );

                console.log(`Updated user ${user}: PnL=${(newPnl / 1_000_000_000).toFixed(4)}, WinRate=${newWinRate.toFixed(1)}%, RankScore=${Math.floor(newRankScore)}`);
            }

            await client.query('COMMIT');
            console.log(`Indexed PayoutClaimed: ${signature}`);
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    async syncSingleMarketFromTx(signature: string) {
        try {
            const txResponse = await this.connection.getTransaction(signature, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            if (!txResponse) return;

            await this.syncAllMarkets();
        } catch (err) {
            console.error('syncSingleMarketFromTx error:', err);
        }
    }

    private calculatePrices(yesShares: number, noShares: number) {
        if (yesShares === 0 && noShares === 0) return { yesPrice: 0.5, noPrice: 0.5 };
        if (yesShares === 0) return { yesPrice: 0, noPrice: 1 };
        if (noShares === 0) return { yesPrice: 1, noPrice: 0 };

        const total = yesShares + noShares;
        const yesPrice = noShares / total;
        const noPrice = yesShares / total;
        return { yesPrice, noPrice };
    }

    private async savePriceSnapshot(client: any, marketId: string, yesShares: number, noShares: number, totalCollateral: string, slot: number) {
        const { yesPrice, noPrice } = this.calculatePrices(yesShares, noShares);

        await client.query(
            `INSERT INTO price_snapshots (
                market_id, yes_price, no_price, total_collateral, slot, timestamp
            ) VALUES ($1, $2, $3, $4, $5, NOW())`,
            [marketId, yesPrice, noPrice, totalCollateral, slot]
        );
    }
}
