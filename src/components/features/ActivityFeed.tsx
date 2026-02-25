import { cn } from '@/lib/cn';
import { useMarketActivity } from '@/hooks/useMarketActivity';

interface ActivityFeedProps {
    marketId: string;
}

export function ActivityFeed({ marketId }: ActivityFeedProps) {
    const { activities, isLoading, isLoadingMore, hasMore, loadMore } = useMarketActivity(marketId);

    if (isLoading) {
        return (
            <div className="space-y-3">
                <h3 className="text-[14px] font-semibold text-white">Activity</h3>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 text-center text-[var(--text-secondary)] text-[13px]">
                    Loading activity...
                </div>
            </div>
        );
    }

    if (activities.length === 0) {
        return (
            <div className="space-y-3">
                <h3 className="text-[14px] font-semibold text-white">Activity</h3>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 text-center text-[var(--text-secondary)] text-[13px]">
                    No recent activity
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-[14px] font-semibold text-white">Activity</h3>
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
                {activities.map((activity, i) => (
                    <div key={activity.signature + i} className="px-4 py-2.5 flex items-center justify-between text-[13px] border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
                        <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-[var(--text-muted)]">{activity.user}</span>
                            <span className={cn(
                                "text-[11px] font-semibold uppercase",
                                activity.type === 'buy-yes' ? "text-[var(--pump-color)]" :
                                    activity.type === 'buy-no' ? "text-[var(--dump-color)]" :
                                        "text-[var(--sol-purple)]"
                            )}>
                                {activity.action}
                            </span>
                        </div>
                        <div className="text-right">
                            <div className="font-mono text-white text-[13px]">{activity.amount}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">{activity.time}</div>
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && (
                <button
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className={cn(
                        "w-full py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all",
                        "bg-[var(--bg-card)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white",
                        "border border-[var(--border)] hover:border-[var(--border-light)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                >
                    {isLoadingMore ? 'Loading...' : 'Load More'}
                </button>
            )}
        </div>
    );
}
