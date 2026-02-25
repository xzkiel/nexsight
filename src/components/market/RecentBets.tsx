import { Bet } from '@/types/market';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { cn } from '@/lib/cn';

dayjs.extend(relativeTime);

interface RecentBetsProps {
    bets: Bet[];
}

export function RecentBets({ bets }: RecentBetsProps) {
    return (
        <div className="border border-[var(--border)] rounded-[var(--radius-lg)] bg-[var(--bg-card)]">
            <div className="p-3 border-b border-[var(--border)]">
                <h3 className="text-[13px] font-semibold text-white">Recent Activity</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
                {bets.map((bet) => (
                    <div key={bet.id} className="px-3 py-2.5 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors">
                        <div className="flex items-center gap-2.5">
                            <div className={cn(
                                "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold",
                                bet.outcome === 'Yes'
                                    ? "bg-[var(--pump-bg)] text-[var(--pump-color)]"
                                    : "bg-[var(--dump-bg)] text-[var(--dump-color)]"
                            )}>
                                {bet.outcome === 'Yes' ? 'P' : 'D'}
                            </div>
                            <div>
                                <div className="text-[12px] font-medium text-white">
                                    {bet.user.slice(0, 4)}...{bet.user.slice(-4)}
                                </div>
                                <div className="text-[11px] text-[var(--text-muted)]">
                                    {dayjs(bet.timestamp).fromNow()}
                                </div>
                            </div>
                        </div>

                        <div className="text-right">
                            <div className="text-[12px] font-medium text-white">{bet.amount.toFixed(4)} SOL</div>
                            <div className="text-[11px] text-[var(--text-muted)]">@{bet.price}¢</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
