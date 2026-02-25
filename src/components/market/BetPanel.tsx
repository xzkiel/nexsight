'use client';

import { useState, useEffect } from 'react';
import { Market } from '@/types/market';
import { cn } from '@/lib/cn';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useBet } from '@/hooks/useBet';
import { useClaimPayout } from '@/hooks/useClaimPayout';
import { useUserPositions } from '@/hooks/useUserPositions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Wallet, ArrowRight, TrendingUp } from '@/components/ui/Icons';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BetPanelProps {
    market: Market;
}

const QUICK_AMOUNTS = [10, 25, 50, 100];

export function BetPanel({ market }: BetPanelProps) {
    const { connected, publicKey } = useWallet();
    const { connection } = useConnection();
    const [outcome, setOutcome] = useState<'Yes' | 'No'>('Yes');
    const [amount, setAmount] = useState<string>('');
    const [walletBalance, setWalletBalance] = useState<number | null>(null);

    const { mutate: placeBet, isPending: isBetLoading } = useBet();
    const { mutate: claimPayout, isPending: isClaimLoading } = useClaimPayout();
    const { data: positions } = useUserPositions();

    const isLoading = isBetLoading || isClaimLoading;

    useEffect(() => {
        if (!publicKey || !connection) {
            setWalletBalance(null);
            return;
        }
        let cancelled = false;
        const fetchBalance = async () => {
            try {
                const balance = await connection.getBalance(publicKey);
                if (!cancelled) setWalletBalance(balance / LAMPORTS_PER_SOL);
            } catch (err) {
                console.error('Failed to fetch balance:', err);
            }
        };
        fetchBalance();
        const interval = setInterval(fetchBalance, 15000);
        return () => { cancelled = true; clearInterval(interval); };
    }, [publicKey, connection]);

    const handlePlaceBet = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        placeBet({
            marketId: market.marketId,
            outcome: outcome.toLowerCase() as 'yes' | 'no',
            amount: parseFloat(amount)
        }, {
            onSuccess: () => {
                setAmount('');
                toast.success(`Purchased ${outcome === 'Yes' ? 'Pump' : 'Dump'} shares!`);
            }
        });
    };

    const price = outcome === 'Yes' ? market.yesPrice : market.noPrice;

    // CPMM estimated shares
    // Pool values from backend are in lamports; convert to SOL for consistent math
    const feeBps = market.feeBps ?? 200;
    const amountNum = parseFloat(amount) || 0;
    const netAmount = amountNum * (1 - feeBps / 10000);

    let estShares = 0;
    if (netAmount > 0 && market.totalYesShares > 0 && market.totalNoShares > 0) {
        const yesPool = market.totalYesShares / LAMPORTS_PER_SOL;
        const noPool = market.totalNoShares / LAMPORTS_PER_SOL;
        const k = yesPool * noPool;

        if (outcome === 'Yes') {
            const newNo = noPool + netAmount;
            estShares = yesPool - k / newNo;
        } else {
            const newYes = yesPool + netAmount;
            estShares = noPool - k / newYes;
        }
    }

    const avgPrice = estShares > 0 ? amountNum / estShares : price;
    const potentialReturn = estShares;
    const roi = amount ? ((potentialReturn - parseFloat(amount)) / parseFloat(amount)) * 100 : 0;
    const profit = potentialReturn - (parseFloat(amount) || 0);

    // Resolved state
    if (market.status === 'resolved') {
        const winningOutcome = market.resolvedOutcome;
        const userPosition = positions?.find(p => p.marketPubkey === market.id);

        let winningShares = 0;
        if (winningOutcome === 'Yes') winningShares = userPosition?.yesShares || 0;
        if (winningOutcome === 'No') winningShares = userPosition?.noShares || 0;

        const hasWinnings = winningShares > 0;
        const estimatedPayout = winningShares;

        return (
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-[var(--radius-sm)] bg-[var(--sol-purple)]/20 text-[var(--sol-purple)]">
                        <TrendingUp size={16} />
                    </div>
                    <div>
                        <h3 className="text-[15px] font-semibold text-white">Resolved</h3>
                        <p className="text-[12px] text-[var(--text-secondary)]">Trading ended</p>
                    </div>
                </div>

                <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] border border-[var(--border)] text-center space-y-1">
                    <span className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider">Winner</span>
                    <div className={cn(
                        "text-[24px] font-bold uppercase",
                        market.resolvedOutcome === 'Yes' ? "text-[var(--pump-color)]" :
                            market.resolvedOutcome === 'No' ? "text-[var(--dump-color)]" : "text-white"
                    )}>
                        {market.resolvedOutcome === 'Yes' ? 'PUMP' : market.resolvedOutcome === 'No' ? 'DUMP' : 'Unknown'}
                    </div>
                </div>

                {connected && hasWinnings && (
                    <div className="pt-3 border-t border-[var(--border)] space-y-3">
                        <div className="flex justify-between items-center text-[13px]">
                            <span className="text-[var(--text-secondary)]">Your Winnings</span>
                            <span className="text-[var(--pump-color)] font-semibold">{estimatedPayout.toFixed(2)} SOL</span>
                        </div>

                        <Button
                            fullWidth
                            disabled={isLoading}
                            onClick={() => {
                                if (!winningOutcome || winningOutcome === 'Invalid') return;
                                claimPayout({
                                    marketId: market.marketId,
                                    marketPubkey: market.id,
                                    winningOutcome: winningOutcome.toLowerCase() as 'yes' | 'no'
                                });
                            }}
                        >
                            {isLoading ? "Claiming..." : "Claim Payout"}
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-white">Place Order</h3>

            {/* Outcome Toggle */}
            <div className="grid grid-cols-2 gap-2">
                {['Yes', 'No'].map((opt) => {
                    const isSelected = outcome === opt;
                    const isYes = opt === 'Yes';
                    const basePrice = isYes ? market.yesPrice : market.noPrice;

                    return (
                        <button
                            key={opt}
                            onClick={() => setOutcome(opt as 'Yes' | 'No')}
                            className={cn(
                                "py-2.5 px-3 rounded-[var(--radius-md)] text-[13px] font-semibold transition-all flex flex-col items-center gap-0.5 border",
                                isSelected
                                    ? isYes
                                        ? "bg-[var(--pump-bg)] text-[var(--pump-color)] border-[var(--pump-border)]"
                                        : "bg-[var(--dump-bg)] text-[var(--dump-color)] border-[var(--dump-border)]"
                                    : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-light)]"
                            )}
                        >
                            <span className="uppercase tracking-wide">{isYes ? 'Pump' : 'Dump'}</span>
                            <span className="font-mono text-[11px] opacity-80">{(basePrice * 100).toFixed(0)}¢</span>
                        </button>
                    );
                })}
            </div>

            {/* Amount */}
            <div className="space-y-2">
                <div className="flex justify-between items-center text-[11px] text-[var(--text-secondary)]">
                    <span className="font-medium">Amount (SOL)</span>
                    <span className="flex items-center gap-1">
                        <Wallet size={10} />
                        {walletBalance !== null ? `${walletBalance.toFixed(4)}` : '--'}
                    </span>
                </div>

                <div className="relative">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full h-9 pl-3 pr-16 bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-md)] text-[14px] font-mono text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--pump-border)] transition-colors"
                    />
                    <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-[var(--pump-color)] hover:text-[var(--green-bright)] transition-colors"
                        onClick={() => {
                            if (walletBalance !== null && walletBalance > 0) {
                                const maxBet = Math.max(0, walletBalance - 0.01);
                                setAmount(maxBet.toFixed(4));
                            }
                        }}
                    >
                        MAX
                    </button>
                </div>

                <div className="flex gap-1.5">
                    {QUICK_AMOUNTS.map((amt) => (
                        <button
                            key={amt}
                            onClick={() => setAmount(amt.toString())}
                            className="flex-1 py-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] text-[11px] font-mono text-[var(--text-secondary)] transition-colors"
                        >
                            {amt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Order Summary */}
            {amount && parseFloat(amount) > 0 && (
                <div className="rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] p-3 space-y-2 font-mono text-[12px] border border-[var(--border)]">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Avg Price</span>
                        <span>{(avgPrice * 100).toFixed(1)}¢</span>
                    </div>
                    <div className="flex justify-between text-[var(--text-secondary)]">
                        <span>Est. Shares</span>
                        <span>{estShares.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-[var(--border)]" />
                    <div className="flex justify-between items-center">
                        <span className="text-white">Payout</span>
                        <span className={cn("font-semibold text-[14px]", outcome === 'Yes' ? "text-[var(--pump-color)]" : "text-[var(--dump-color)]")}>
                            {potentialReturn.toFixed(2)} SOL
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                        <span className="text-[var(--text-muted)]">Profit</span>
                        <span className="text-[var(--pump-color)] flex items-center gap-1">
                            <TrendingUp size={10} />
                            +{profit.toFixed(2)} ({roi.toFixed(0)}%)
                        </span>
                    </div>
                </div>
            )}

            {/* Action */}
            {connected ? (
                <Button
                    fullWidth
                    disabled={isLoading || !amount}
                    onClick={handlePlaceBet}
                    className={cn(
                        "font-semibold",
                        outcome === 'Yes'
                            ? "bg-[var(--pump-color)] hover:bg-[var(--green-dim)] text-black"
                            : "bg-[var(--dump-color)] hover:opacity-90 text-white"
                    )}
                >
                    {isLoading ? "Signing..." : (
                        <span className="flex items-center gap-1.5">
                            {outcome === 'Yes' ? 'Buy Pump' : 'Buy Dump'} <ArrowRight size={14} />
                        </span>
                    )}
                </Button>
            ) : (
                <div className="[&_.wallet-adapter-button]:!w-full [&_.wallet-adapter-button]:!justify-center">
                    <WalletMultiButton />
                </div>
            )}
        </div>
    );
}
