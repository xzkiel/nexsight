import { Market } from '@/types/market';
import Link from 'next/link';
import { TrendingUp, Clock } from 'lucide-react';
import { cn } from '@/lib/cn';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(advancedFormat);
dayjs.extend(relativeTime);

interface MarketCardProps extends Market {
    isTrending?: boolean;
}

export function MarketCard({ id, title, category, volume24h = 0, yesPrice = 0.5, noPrice = 0.5, isTrending, endTimestamp }: MarketCardProps) {
    const probability = yesPrice * 100;

    const getEndTimeDisplay = () => {
        const end = dayjs(endTimestamp);
        const now = dayjs();
        const diffDays = end.diff(now, 'day');

        if (diffDays < 1) {
            const diffHours = end.diff(now, 'hour');
            if (diffHours <= 0) return 'Ended';
            return `${diffHours}h left`;
        }
        if (diffDays < 7) return `${diffDays}d left`;
        if (diffDays < 30) {
            const weeks = Math.round(diffDays / 7);
            return `${weeks}w left`;
        }
        return end.format('MMM D');
    };

    return (
        <Link
            href={`/markets/${id}`}
            className="block bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 hover:border-[var(--border-light)] hover:bg-[var(--bg-card-hover)] transition-all group"
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                        {category}
                    </span>
                    {isTrending && (
                        <span className="text-[10px] font-medium text-[var(--pump-color)] bg-[var(--pump-bg)] px-2 py-0.5 rounded-[var(--radius-sm)]">
                            HOT
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                    <Clock size={10} />
                    <span>{getEndTimeDisplay()}</span>
                </div>
            </div>

            {/* Title */}
            <h3 className="text-[14px] font-semibold text-white leading-snug mb-4 group-hover:text-[var(--pump-color)] transition-colors line-clamp-2">
                {title}
            </h3>

            {/* Probability Bar */}
            <div className="space-y-2 mb-4">
                <div className="flex justify-between text-[12px] font-medium">
                    <span className="text-[var(--pump-color)]">Pump {probability.toFixed(0)}%</span>
                    <span className="text-[var(--dump-color)]">Dump {(100 - probability).toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden flex">
                    <div
                        className="bg-[var(--pump-color)] h-full rounded-full transition-all duration-500"
                        style={{ width: `${probability}%` }}
                    />
                </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                    <TrendingUp size={11} />
                    {volume24h.toLocaleString()} SOL
                </span>
                <span className="text-[var(--pump-color)] font-medium opacity-0 group-hover:opacity-100 transition-opacity text-[11px]">
                    Trade →
                </span>
            </div>
        </Link>
    );
}
