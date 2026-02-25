'use client';

import { useUserPositions, UserPositionData } from '@/hooks/useUserPositions';
import { useClaimPayout } from '@/hooks/useClaimPayout';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ArrowUpRight, ArrowDownRight, TrendingUp, History, Wallet, ArrowRight } from '@/components/ui/Icons';

function PositionCard({ position }: { position: UserPositionData }) {
    const { mutate: claimPayout, isPending: isClaiming } = useClaimPayout();

    const hasYes = position.yesShares > 0;
    const hasNo = position.noShares > 0;
    const isResolved = position.marketStatus === 'resolved';

    const yesValue = position.yesShares * position.currentYesPrice;
    const noValue = position.noShares * position.currentNoPrice;
    const currentValue = yesValue + noValue;

    const wonYes = isResolved && position.resolvedOutcome === 'Yes' && hasYes;
    const wonNo = isResolved && position.resolvedOutcome === 'No' && hasNo;
    const canClaim = (wonYes || wonNo) && position.totalClaimed === 0;

    const side = hasYes ? 'PUMP' : 'DUMP';
    const shares = hasYes ? position.yesShares : position.noShares;
    const price = hasYes ? position.currentYesPrice : position.currentNoPrice;

    const costBasis = position.totalDeposited;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;
    const isPositive = pnl >= 0;

    const handleClaim = () => {
        const winningOutcome = wonYes ? 'yes' : 'no';
        claimPayout({
            marketId: position.marketId,
            marketPubkey: position.marketPubkey,
            winningOutcome,
        });
    };

    return (
        <tr className="hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border)] last:border-0">
            <td className="px-4 py-3 text-[13px] font-medium text-white max-w-xs">
                <Link href={`/markets/${position.marketPubkey}`} className="hover:text-[var(--pump-color)] transition-colors line-clamp-1 block">
                    {position.marketTitle}
                </Link>
                <div className="flex gap-1.5 mt-1">
                    {isResolved && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                            Resolved: {position.resolvedOutcome}
                        </Badge>
                    )}
                    {canClaim && (
                        <Badge variant="success" className="text-[10px] h-4 px-1.5 animate-pulse">
                            Claimable
                        </Badge>
                    )}
                </div>
            </td>
            <td className="px-4 py-3">
                <Badge variant={side === 'PUMP' ? 'success' : 'destructive'} className="font-mono text-[11px]">
                    {side}
                </Badge>
            </td>
            <td className="px-4 py-3 text-right font-mono text-[13px] text-[var(--text-secondary)]">
                {shares.toFixed(2)}
            </td>
            <td className="px-4 py-3 text-right font-mono text-[13px] text-[var(--text-secondary)]">
                {(price * 100).toFixed(1)}¢
            </td>
            <td className={cn("px-4 py-3 text-right font-mono text-[13px] font-medium", isPositive ? "text-[var(--pump-color)]" : "text-[var(--dump-color)]")}>
                <div className="flex items-center justify-end gap-1">
                    {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(pnl).toFixed(4)}
                    <span className="text-[11px] opacity-70 ml-0.5">({pnlPercent.toFixed(1)}%)</span>
                </div>
            </td>
            <td className="px-4 py-3 text-right">
                {canClaim ? (
                    <Button
                        size="sm"
                        variant="primary"
                        className="h-7 text-[11px] px-3"
                        onClick={handleClaim}
                        isLoading={isClaiming}
                    >
                        Claim
                    </Button>
                ) : (
                    <Link
                        href={`/markets/${position.marketPubkey}`}
                        className="inline-flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors h-7 w-7"
                    >
                        <ArrowRight size={14} />
                    </Link>
                )}
            </td>
        </tr>
    );
}

export default function PortfolioPage() {
    const { connected } = useWallet();
    const { data: positions, isLoading } = useUserPositions();
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return null;

    if (!connected) {
        return (
            <div className="p-5 flex items-center justify-center min-h-[60vh]">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] max-w-sm mx-auto p-8 space-y-5 text-center">
                    <Wallet className="mx-auto w-12 h-12 text-[var(--text-muted)]" />
                    <h2 className="text-[16px] font-semibold text-white">Connect Wallet</h2>
                    <p className="text-[13px] text-[var(--text-secondary)]">Connect your Solana wallet to view your portfolio.</p>
                    <div className="flex justify-center">
                        <WalletMultiButton />
                    </div>
                </div>
            </div>
        );
    }

    const totalInvested = positions?.reduce((sum, p) => sum + p.totalDeposited, 0) ?? 0;
    const totalCurrentValue = positions?.reduce((sum, p) => {
        const yesValue = p.yesShares * p.currentYesPrice;
        const noValue = p.noShares * p.currentNoPrice;
        return sum + yesValue + noValue;
    }, 0) ?? 0;
    const totalPnL = totalCurrentValue - totalInvested;
    const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested) * 100 : 0;

    const claimablePositions = positions?.filter(p => {
        if (p.marketStatus !== 'resolved') return false;
        if (p.totalClaimed > 0) return false;
        const wonYes = p.resolvedOutcome === 'Yes' && p.yesShares > 0;
        const wonNo = p.resolvedOutcome === 'No' && p.noShares > 0;
        return wonYes || wonNo;
    }) ?? [];

    const totalClaimable = claimablePositions.reduce((sum, p) => {
        const payout = p.resolvedOutcome === 'Yes' ? p.yesShares : p.noShares;
        return sum + payout;
    }, 0);

    return (
        <div className="p-5 space-y-5">
            <h1 className="text-[18px] font-semibold text-white">Portfolio</h1>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4">
                    <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Invested</div>
                    <div className="text-[18px] font-semibold font-mono text-white">{totalInvested.toFixed(4)} SOL</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4">
                    <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">PnL</div>
                    <div className={cn("text-[18px] font-semibold font-mono", totalPnL >= 0 ? "text-[var(--pump-color)]" : "text-[var(--dump-color)]")}>
                        {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(4)} SOL
                    </div>
                    <div className="text-[11px] text-[var(--text-secondary)]">{pnlPercent.toFixed(1)}%</div>
                </div>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-4">
                    <div className="text-[11px] text-[var(--text-muted)] uppercase tracking-wide mb-1">Claimable</div>
                    <div className="text-[18px] font-semibold font-mono text-white">{totalClaimable.toFixed(4)} SOL</div>
                    {totalClaimable > 0 && (
                        <div className="text-[11px] text-[var(--pump-color)]">{claimablePositions.length} ready</div>
                    )}
                </div>
            </div>

            {/* Positions Table */}
            <div className="space-y-3">
                <h2 className="text-[14px] font-semibold text-white">Open Positions</h2>

                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase text-[11px] tracking-wide font-medium">
                                <tr>
                                    <th className="px-4 py-2.5">Market</th>
                                    <th className="px-4 py-2.5">Side</th>
                                    <th className="px-4 py-2.5 text-right">Shares</th>
                                    <th className="px-4 py-2.5 text-right">Price</th>
                                    <th className="px-4 py-2.5 text-right">PnL</th>
                                    <th className="px-4 py-2.5 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)] text-[13px]">Loading...</td>
                                    </tr>
                                ) : positions?.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-secondary)] text-[13px]">
                                            No positions. <Link href="/markets" className="text-[var(--pump-color)] hover:underline">Start trading</Link>
                                        </td>
                                    </tr>
                                ) : (
                                    positions?.map((pos) => (
                                        <PositionCard key={pos.publicKey} position={pos} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
