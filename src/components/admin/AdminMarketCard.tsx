import { Market } from '@/types/market';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useResolve } from '@/hooks/useResolve';
import { usePythResolve } from '@/hooks/usePythResolve';
import { getFeedLabel } from '@/lib/pyth-feeds';
import { Loader2, Zap } from '@/components/ui/Icons';
import dayjs from 'dayjs';

interface AdminMarketCardProps {
    market: Market;
}

export function AdminMarketCard({ market }: AdminMarketCardProps) {
    const { mutate: resolve, isPending: isManualPending } = useResolve();
    const { mutate: pythResolve, isPending: isPythPending } = usePythResolve();

    const isPending = isManualPending || isPythPending;
    const isPyth = market.oracleSource === 'pyth';
    const feedLabel = isPyth && market.oracleFeed ? getFeedLabel(market.oracleFeed) : null;
    const isExpired = market.endTimestamp ? new Date(market.endTimestamp) <= new Date() : false;

    const handleResolve = (outcome: 'yes' | 'no') => {
        if (confirm(`Are you sure you want to resolve this market as ${outcome.toUpperCase()}?`)) {
            resolve({
                marketId: market.marketId,
                outcome
            });
        }
    };

    const handlePythResolve = () => {
        if (!market.oracleFeed) {
            alert("Market has no oracle feed configured");
            return;
        }
        if (!isExpired) {
            alert("Market has not reached its end time yet");
            return;
        }
        if (confirm(`Resolve this market using the Pyth ${feedLabel || 'oracle'} price feed?`)) {
            pythResolve({
                marketId: market.marketId,
                oracleFeed: market.oracleFeed,
            });
        }
    };

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 space-y-3">
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-2 mb-1.5">
                        <Badge variant="outline">{market.category}</Badge>
                        <Badge variant={
                            market.status === 'active' ? 'success' :
                                market.status === 'resolved' ? 'secondary' : 'default'
                        }>
                            {market.status}
                        </Badge>
                        {isPyth && (
                            <Badge variant="outline" className="text-[var(--sol-purple)] border-[var(--sol-purple)]/30">
                                Pyth {feedLabel || 'Oracle'}
                            </Badge>
                        )}
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">#{market.marketId}</span>
                    </div>
                    <h3 className="text-[14px] font-semibold text-white leading-tight">{market.title}</h3>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[12px] text-[var(--text-secondary)]">
                <div>
                    <span className="block text-[11px] text-[var(--text-muted)]">End Time</span>
                    {dayjs(market.endTimestamp).format('MMM D, YYYY HH:mm')}
                </div>
                <div>
                    <span className="block text-[11px] text-[var(--text-muted)]">Source</span>
                    {isPyth ? `Pyth ${feedLabel || 'Oracle'}` : 'Manual'}
                </div>
            </div>

            {market.status === 'resolved' ? (
                <div className="pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
                    <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Winner</span>
                    <Badge
                        variant="outline"
                        className={market.resolvedOutcome === 'Yes'
                            ? "bg-[var(--pump-bg)] text-[var(--pump-color)] border-[var(--pump-border)]"
                            : "bg-[var(--dump-bg)] text-[var(--dump-color)] border-[var(--dump-border)]"
                        }
                    >
                        {market.resolvedOutcome === 'Yes' ? 'PUMP' : 'DUMP'}
                    </Badge>
                </div>
            ) : (
                <div className="pt-2.5 border-t border-[var(--border)]">
                    <p className="text-[11px] font-medium text-[var(--sol-purple)] mb-2 uppercase tracking-wider">Resolve</p>

                    {isPyth ? (
                        /* Pyth oracle resolution — permissionless, oracle decides outcome */
                        <div className="space-y-2">
                            <Button
                                size="sm"
                                className="w-full bg-[var(--sol-purple)]/10 text-[var(--sol-purple)] hover:bg-[var(--sol-purple)]/20 border border-[var(--sol-purple)]/30"
                                onClick={handlePythResolve}
                                disabled={isPending || !isExpired}
                            >
                                {isPythPending ? (
                                    <Loader2 className="animate-spin mr-2" size={12} />
                                ) : (
                                    <Zap className="mr-2" size={12} />
                                )}
                                {isPythPending ? 'Posting Price & Resolving...' : 'Resolve with Pyth Oracle'}
                            </Button>
                            {!isExpired && (
                                <p className="text-[10px] text-[var(--text-muted)] text-center">
                                    Awaiting end time ({dayjs(market.endTimestamp).fromNow()})
                                </p>
                            )}
                            {/* Admin fallback: manual override */}
                            <details className="mt-2">
                                <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
                                    Admin Override (Manual)
                                </summary>
                                <div className="flex gap-2 mt-2">
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-[var(--pump-bg)] text-[var(--pump-color)] hover:bg-[var(--pump-bg-hover)] border border-[var(--pump-border)]"
                                        onClick={() => handleResolve('yes')}
                                        disabled={isPending}
                                    >
                                        {isManualPending ? <Loader2 className="animate-spin" size={12} /> : 'Pump'}
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="flex-1 bg-[var(--dump-bg)] text-[var(--dump-color)] hover:bg-[var(--dump-bg-hover)] border border-[var(--dump-border)]"
                                        onClick={() => handleResolve('no')}
                                        disabled={isPending}
                                    >
                                        {isManualPending ? <Loader2 className="animate-spin" size={12} /> : 'Dump'}
                                    </Button>
                                </div>
                            </details>
                        </div>
                    ) : (
                        /* Manual admin resolution — admin picks the outcome */
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                className="flex-1 bg-[var(--pump-bg)] text-[var(--pump-color)] hover:bg-[var(--pump-bg-hover)] border border-[var(--pump-border)]"
                                onClick={() => handleResolve('yes')}
                                disabled={isPending}
                            >
                                {isManualPending ? <Loader2 className="animate-spin" size={12} /> : 'Pump'}
                            </Button>
                            <Button
                                size="sm"
                                className="flex-1 bg-[var(--dump-bg)] text-[var(--dump-color)] hover:bg-[var(--dump-bg-hover)] border border-[var(--dump-border)]"
                                onClick={() => handleResolve('no')}
                                disabled={isPending}
                            >
                                {isManualPending ? <Loader2 className="animate-spin" size={12} /> : 'Dump'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
