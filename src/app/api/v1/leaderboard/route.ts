import { NextResponse } from 'next/server';
import { LeaderboardService } from '@/server/services/leaderboard';

const leaderboardService = new LeaderboardService();

export async function GET() {
    try {
        const leaderboard = await leaderboardService.getGlobalLeaderboard(50);
        return NextResponse.json({
            data: leaderboard,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('Leaderboard Error:', err);
        return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
    }
}
