import { Market } from '@/types/market';
import { cn } from '@/lib/cn';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/Badge';

interface MarketInfoProps {
    market: Market;
}

export function MarketInfo({ market }: MarketInfoProps) {
    const isExpired = dayjs(market.endTimestamp).isBefore(dayjs());

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <div className="flex gap-4">
                {market.image ? (
                    <img src={market.image} alt={market.title} className="w-14 h-14 rounded-[var(--radius-md)] object-cover" />
                ) : (
                    <div className="w-14 h-14 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)] flex items-center justify-center text-2xl">
                        🔮
                    </div>
                )}

                <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                            {market.category}
                        </Badge>
                        <Badge
                            variant={market.status === 'resolved' ? "secondary" : isExpired ? "secondary" : "success"}
                            className={cn("uppercase text-[10px] tracking-wider", (!isExpired && market.status !== 'resolved') && "animate-pulse")}
                        >
                            {market.status === 'resolved' ? "Resolved" : isExpired ? "Ended" : "Live"}
                        </Badge>
                    </div>

                    <h1 className="text-[18px] font-semibold leading-tight text-white">
                        {market.title}
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[var(--border)]">
                <StatBox label="Volume" value={`${((market.volume24h || 0) / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`} />
                <StatBox label="Liquidity" value={`${((market.totalCollateral || 0) / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })} SOL`} />
                <StatBox label="End Date" value={dayjs(market.endTimestamp).format('MMM D, YYYY')} />
                <StatBox
                    label="Oracle"
                    value={market.oracleSource}
                    subValue={market.oracleFeed}
                    isAddress
                />
            </div>
        </div>
    );
}

function StatBox({ label, value, subValue, isAddress }: { label: string, value: string, subValue?: string, isAddress?: boolean }) {
    return (
        <div className="space-y-0.5">
            <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide font-medium">{label}</span>
            <div className="font-mono text-[13px] font-medium text-white flex items-center gap-1.5">
                {value}
                {isAddress && subValue && (
                    <span className="text-[11px] px-1.5 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors">
                        {subValue.slice(0, 4)}...
                    </span>
                )}
            </div>
        </div>
    );
}
