import Link from 'next/link';
import { cn } from '@/lib/cn';
import { Market } from '@/types/market';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface MarketCardProps extends Market { }

export function MarketCard(market: MarketCardProps) {
    const { id, title, volume24h, yesPrice, noPrice, image, endTimestamp } = market;

    const formattedVolume = `${(volume24h || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`;
    const endTime = dayjs(endTimestamp).fromNow(true) + ' left';

    return (
        <Link href={`/markets/${id}`} className="group block">
            <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all hover:border-[var(--pump-color)]/30">
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        {image ? (
                            <img src={image} alt="Market" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center text-lg">
                                🔮
                            </div>
                        )}
                        <h3 className="text-[13px] font-semibold text-white leading-tight line-clamp-2">{title}</h3>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-[var(--radius-md)] bg-[var(--pump-bg)] p-2 text-center border border-[var(--pump-border)]">
                        <div className="text-[10px] text-[var(--pump-color)] font-medium uppercase">Pump</div>
                        <div className="text-[15px] font-bold text-[var(--pump-color)]">{(yesPrice * 100).toFixed(0)}¢</div>
                    </div>
                    <div className="rounded-[var(--radius-md)] bg-[var(--dump-bg)] p-2 text-center border border-[var(--dump-border)]">
                        <div className="text-[10px] text-[var(--dump-color)] font-medium uppercase">Dump</div>
                        <div className="text-[15px] font-bold text-[var(--dump-color)]">{(noPrice * 100).toFixed(0)}¢</div>
                    </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span>Vol: {formattedVolume}</span>
                    <span>Ends {endTime}</span>
                </div>
            </div>
        </Link>
    );
}
