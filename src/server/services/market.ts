import { db } from '../config/db';
import { redis } from '../config/redis';

export interface Market {
    id: string;
    market_id: string;
    title: string;
    category: string;
    status: string;
    end_timestamp: Date;
    volume_24h: number;
}

export class MarketService {

    static async list(page: number, limit: number, category?: string) {
        const offset = (page - 1) * limit;
        let query = `SELECT * FROM markets WHERE 1=1`;
        const params: any[] = [];

        if (category && category !== 'All') {
            query += ` AND category = $${params.length + 1}`;
            params.push(category);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const res = await db.query(query, params);
        return res.rows.map(MarketService.toDTO);
    }

    static async getById(marketId: string) {
        const cacheKey = `market:${marketId}`;
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);

        const isNumeric = /^\d+$/.test(marketId);
        const res = isNumeric
            ? await db.query(`SELECT * FROM markets WHERE market_id = $1`, [marketId])
            : await db.query(`SELECT * FROM markets WHERE pubkey = $1`, [marketId]);
        const market = res.rows[0];

        if (market) {
            const dto = MarketService.toDTO(market);
            await redis.setex(cacheKey, 5, JSON.stringify(dto));
            return dto;
        }

        return null;
    }

    static async getHistory(marketId: string) {
        console.log(`[MarketService] getHistory called for: ${marketId}`);
        let numericId = marketId;
        const isNumeric = /^\d+$/.test(marketId);

        if (!isNumeric) {
            const m = await db.query(`SELECT market_id FROM markets WHERE pubkey = $1`, [marketId]);
            if (m.rows.length === 0) {
                console.log(`[MarketService] Market not found for pubkey: ${marketId}`);
                return [];
            }
            numericId = m.rows[0].market_id;
            console.log(`[MarketService] Resolved pubkey ${marketId} to numericId ${numericId}`);
        }

        const cacheKey = `market:${numericId}:history`;

        const res = await db.query(
            `SELECT timestamp, yes_price, no_price 
             FROM price_snapshots 
             WHERE market_id = $1 
             ORDER BY timestamp ASC`,
            [numericId]
        );

        console.log(`[MarketService] Found ${res.rowCount} snapshots for ${numericId}`);

        const history = res.rows.map((row: any) => ({
            timestamp: new Date(row.timestamp).getTime(),
            yesPrice: parseFloat(row.yes_price),
            noPrice: parseFloat(row.no_price)
        }));

        await redis.setex(cacheKey, 10, JSON.stringify(history));
        return history;
    }

    private static toDTO(row: any) {
        const yesShares = parseFloat(row.total_yes_shares || '0');
        const noShares = parseFloat(row.total_no_shares || '0');
        const totalShares = yesShares + noShares;

        let yesPrice = 0.5;
        let noPrice = 0.5;

        if (totalShares > 0) {
            yesPrice = noShares / totalShares;
            noPrice = yesShares / totalShares;

            if (yesShares === 0 && noShares > 0) { yesPrice = 0; noPrice = 1; }
            if (noShares === 0 && yesShares > 0) { yesPrice = 1; noPrice = 0; }
        }

        return {
            id: row.pubkey,
            marketId: row.market_id,
            creator: row.creator,
            title: row.title,
            description: row.description || '',
            category: row.category,
            status: row.status,
            collateralMint: row.collateral_mint,
            yesMint: row.yes_mint,
            noMint: row.no_mint,
            vault: row.vault,
            totalYesShares: yesShares,
            totalNoShares: noShares,
            totalCollateral: parseFloat(row.total_collateral || '0'),
            volume24h: parseFloat(row.volume_24h || '0'),
            participantCount: parseInt(row.participant_count || '0', 10),
            feeBps: parseInt(row.fee_bps || '200', 10),
            yesPrice,
            noPrice,
            startTimestamp: new Date(row.start_timestamp).getTime(),
            lockTimestamp: new Date(row.lock_timestamp).getTime(),
            endTimestamp: new Date(row.end_timestamp).getTime(),
            oracleSource: row.oracle_source,
            oracleFeed: row.oracle_feed,
            resolvedOutcome: row.resolved_outcome,
            resolutionPrice: row.resolution_price ? parseFloat(row.resolution_price) : undefined,
        };
    }
}
