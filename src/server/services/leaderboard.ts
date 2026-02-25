import { db } from '../config/db';

export interface LeaderboardEntry {
    wallet: string;
    username: string | null;
    avatarUrl: string | null;
    totalVolume: number;
    totalPnl: number;
    totalBets: number;
    winRate: number;
    rankScore: number;
    rank: number;
}

export class LeaderboardService {
    async getGlobalLeaderboard(limit = 100, minBets = 1): Promise<LeaderboardEntry[]> {
        const query = `
            SELECT 
                wallet, 
                username, 
                avatar_url as "avatarUrl",
                total_volume as "totalVolume",
                total_pnl as "totalPnl", 
                total_bets as "totalBets",
                win_rate as "winRate",
                rank_score as "rankScore",
                RANK() OVER (ORDER BY rank_score DESC) as rank
            FROM users
            WHERE total_bets >= $2
            ORDER BY rank_score DESC
            LIMIT $1
        `;

        const result = await db.query(query, [limit, minBets]);
        return result.rows.map(row => ({
            ...row,
            totalVolume: Number(row.totalVolume) / 1_000_000_000,
            totalPnl: Number(row.totalPnl) / 1_000_000_000,
            rankScore: Number(row.rankScore),
        }));
    }
}
