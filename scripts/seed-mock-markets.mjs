import pg from 'pg';
import crypto from 'crypto';

const { Client } = pg;

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
    });

    await client.connect();
    console.log('Connected to DB');

    try {
        const mockMarkets = [
            {
                title: 'Did Donald Trump win the 2024 US Presidential Election?',
                description: 'Resolved to YES as Donald Trump secured the necessary electoral votes to win the 2024 US Presidential Election.',
                category: 'Politics',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did the SEC approve spot Bitcoin ETFs in January 2024?',
                description: 'Resolved to YES after the US Securities and Exchange Commission formally approved 11 spot Bitcoin ETFs on Jan 10, 2024.',
                category: 'Crypto',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did the Kansas City Chiefs win Super Bowl LVIII (2024)?',
                description: 'Resolved to YES. The Kansas City Chiefs defeated the San Francisco 49ers 25-22 in overtime to win Super Bowl LVIII.',
                category: 'Sports',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did OpenAI release GPT-4o in 2024?',
                description: 'Resolved to YES after OpenAI announced and released the GPT-4o ("omni") model in May 2024.',
                category: 'AI',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did Sam Bankman-Fried get a prison sentence of over 20 years?',
                description: 'Resolved to YES as the former FTX CEO was sentenced to 25 years in federal prison in March 2024.',
                category: 'Crypto',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did Taylor Swift win Album of the Year at the 2024 Grammys?',
                description: 'Resolved to YES after Taylor Swift won Album of the Year for "Midnights" at the 66th Annual Grammy Awards.',
                category: 'Pop Culture',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did Bitcoin reach $100,000 in 2023?',
                description: 'Resolved to NO. The highest price of Bitcoin in 2023 peaked at around $44,000 in December.',
                category: 'Crypto',
                resolved_outcome: 'no'
            },
            {
                title: 'Did Rockstar Games release the first GTA VI trailer in 2023?',
                description: 'Resolved to YES as Rockstar released the first official Grand Theft Auto VI trailer in December 2023.',
                category: 'Pop Culture',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did the US Federal Reserve cut interest rates in mid-2024?',
                description: 'Resolved to YES after the Federal Reserve announced a half-point rate cut in September 2024.',
                category: 'Politics',
                resolved_outcome: 'yes'
            },
            {
                title: 'Did Nvidia (NVDA) surpass $3 Trillion market cap in 2024?',
                description: 'Resolved to YES when Nvidia briefly surpassed Apple and Microsoft to reach a $3T+ market cap in June 2024.',
                category: 'Crypto',
                resolved_outcome: 'yes'
            }
        ];

        for (let i = 0; i < mockMarkets.length; i++) {
            const marketData = mockMarkets[i];
            const marketId = Date.now() + i;
            const pubkey = crypto.randomBytes(22).toString('hex'); // 44 chars
            const creator = crypto.randomBytes(22).toString('hex');
            const collateral_mint = crypto.randomBytes(22).toString('hex');
            const yes_mint = crypto.randomBytes(22).toString('hex');
            const no_mint = crypto.randomBytes(22).toString('hex');
            const vault = crypto.randomBytes(22).toString('hex');

            const realisticVolumeSOL = Math.floor(Math.random() * 4500) + 500; // 500 to 5000 SOL
            const total_yes_shares = Math.floor(realisticVolumeSOL * 0.6 * 1e9);
            const total_no_shares = Math.floor(realisticVolumeSOL * 0.4 * 1e9);
            const total_collateral = total_yes_shares + total_no_shares + (100 * 1e9); // slightly more collateral
            const volume_24h = realisticVolumeSOL * 1e9; // store in lamports

            const startTimestamp = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000 - (i * 10 * 24 * 60 * 60 * 1000)).toISOString();
            const lockTimestamp = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000 - (i * 5 * 24 * 60 * 60 * 1000)).toISOString();
            const endTimestamp = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000 - (i * 24 * 60 * 60 * 1000)).toISOString();
            const resolvedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - (i * 24 * 60 * 60 * 1000)).toISOString();
            const resolved_outcome = marketData.resolved_outcome;

            const query = `
                INSERT INTO markets (
                    market_id, pubkey, creator, title, description, category, status,
                    collateral_mint, yes_mint, no_mint, vault, 
                    total_yes_shares, total_no_shares, total_collateral,
                    oracle_source, oracle_feed, oracle_threshold,
                    start_timestamp, lock_timestamp, end_timestamp, resolved_outcome, resolution_price,
                    min_bet, max_bet, fee_bps, is_recurring, yes_price, no_price, volume_24h, participant_count, resolved_at, indexed_slot
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7,
                    $8, $9, $10, $11,
                    $12, $13, $14,
                    $15, $16, $17,
                    $18, $19, $20, $21, $22,
                    $23, $24, $25, $26, $27, $28, $29, $30, $31, $32
                )
            `;

            const values = [
                marketId, pubkey, creator, marketData.title, marketData.description, marketData.category, 'resolved',
                collateral_mint, yes_mint, no_mint, vault,
                total_yes_shares, total_no_shares, total_collateral,
                'ManualAdmin', pubkey, 0,
                startTimestamp, lockTimestamp, endTimestamp, resolved_outcome, 1000000,
                1000, 0, 200, false, 0.5, 0.5, volume_24h, Math.floor(Math.random() * 500) + 10, resolvedAt, 100000000 + i
            ];

            await client.query(query, values);
            console.log(`Inserted mock market: ${marketData.title}`);
        }
    } catch (err) {
        console.error('Failed to insert mock data', err);
    } finally {
        await client.end();
        console.log('Disconnected');
    }
}

main().catch(console.error);
