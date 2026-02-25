'use client';

import { useState, useMemo } from 'react';
import { useMarkets } from '@/hooks/useMarkets';
import { AdminMarketCard } from '@/components/admin/AdminMarketCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { ShieldAlert, Lock } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { COLLATERAL_MINT, ADMIN_WALLETS } from '@/lib/constants';
import { toast } from 'sonner';

export default function AdminPage() {
    const { data: markets, isLoading } = useMarkets();
    const { publicKey, signTransaction, signAllTransactions } = useWallet();
    const [isInitLoading, setIsInitLoading] = useState(false);
    const [isUpdatingMint, setIsUpdatingMint] = useState(false);

    // Gate: only allow configured admin wallets
    const isAdmin = useMemo(() => {
        if (!publicKey) return false;
        return ADMIN_WALLETS.includes(publicKey.toBase58());
    }, [publicKey]);

    const handleInitPlatform = async () => {
        if (!publicKey || !signTransaction || !isAdmin) return;
        try {
            setIsInitLoading(true);
            const provider = getProvider({ publicKey, signTransaction, signAllTransactions });
            if (!provider) throw new Error("Provider issue");
            const program = getProgram(provider);

            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const treasury = await getAssociatedTokenAddress(collateralMint, publicKey);

            await program.methods.initPlatform(200, new BN(1000000))
                .accounts({ collateralMint, treasury })
                .rpc();

            toast.success("Platform initialized!");
        } catch (e: any) {
            console.error(e);
            toast.error("Init Error: " + e.message);
        } finally {
            setIsInitLoading(false);
        }
    };

    const handleUpdateCollateralMint = async () => {
        if (!publicKey || !signTransaction || !isAdmin) return;
        try {
            setIsUpdatingMint(true);
            const provider = getProvider({ publicKey, signTransaction, signAllTransactions });
            if (!provider) throw new Error("Provider issue");
            const program = getProgram(provider);

            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const newTreasury = await getAssociatedTokenAddress(collateralMint, publicKey);

            await program.methods.updateCollateralMint()
                .accounts({ newCollateralMint: collateralMint, newTreasury })
                .rpc();

            toast.success("Collateral mint & treasury updated to wSOL!");
        } catch (e: any) {
            console.error(e);
            toast.error("Update Error: " + e.message);
        } finally {
            setIsUpdatingMint(false);
        }
    };

    // ─── Not connected or not admin → access denied ─────────────────
    if (!publicKey) {
        return (
            <div className="p-5 flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="p-3 bg-[var(--dump-bg)] rounded-full">
                    <Lock size={24} className="text-[var(--dump-color)]" />
                </div>
                <h1 className="text-[18px] font-semibold text-white">Admin Access Required</h1>
                <p className="text-[13px] text-[var(--text-secondary)] text-center max-w-sm">
                    Connect an authorized admin wallet to access platform management.
                </p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="p-5 flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="p-3 bg-[var(--dump-bg)] rounded-full">
                    <Lock size={24} className="text-[var(--dump-color)]" />
                </div>
                <h1 className="text-[18px] font-semibold text-white">Unauthorized</h1>
                <p className="text-[13px] text-[var(--text-secondary)] text-center max-w-sm">
                    This wallet is not authorized as a platform admin.
                </p>
                <code className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2 py-1 rounded font-mono">
                    {publicKey.toBase58().slice(0, 8)}...{publicKey.toBase58().slice(-4)}
                </code>
            </div>
        );
    }

    // ─── Authorized admin view ──────────────────────────────────────
    // Only: Init Platform, Update Collateral, Resolve Manual Markets
    const manualMarkets = markets?.filter(m =>
        m.oracleSource === 'manualAdmin' && m.status !== 'resolved' && m.status !== 'cancelled'
    ) ?? [];

    return (
        <div className="p-5 space-y-5">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--sol-purple)]/20 rounded-[var(--radius-md)] text-[var(--sol-purple)]">
                    <ShieldAlert size={20} />
                </div>
                <div>
                    <h1 className="text-[18px] font-semibold text-white">Admin Panel</h1>
                    <p className="text-[13px] text-[var(--text-secondary)]">Platform init & manual market resolution</p>
                </div>
            </div>

            {/* Platform Operations */}
            <div className="space-y-4">
                <h2 className="text-[14px] font-semibold text-white">Platform Operations</h2>
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-md)] p-3 flex items-center gap-3 flex-wrap">
                    <button
                        disabled={isInitLoading}
                        onClick={handleInitPlatform}
                        className="px-3 py-1.5 text-[12px] bg-[var(--bg-tertiary)] text-white rounded-[var(--radius-sm)] border border-[var(--border)] hover:bg-[var(--bg-card-hover)] transition-colors font-medium disabled:opacity-50"
                    >
                        {isInitLoading ? "Initializing..." : "Init Platform"}
                    </button>
                    <button
                        disabled={isUpdatingMint}
                        onClick={handleUpdateCollateralMint}
                        className="px-3 py-1.5 text-[12px] bg-[var(--warning)]/20 text-[var(--warning)] rounded-[var(--radius-sm)] border border-[var(--warning)]/30 hover:bg-[var(--warning)]/30 transition-colors font-medium disabled:opacity-50"
                    >
                        {isUpdatingMint ? "Updating..." : "Update Mint → wSOL"}
                    </button>
                </div>
            </div>

            {/* Manual Market Resolution */}
            <div className="space-y-3">
                <h2 className="text-[14px] font-semibold text-white">Manual Market Resolution</h2>
                <p className="text-[12px] text-[var(--text-muted)]">
                    Only markets with &apos;manualAdmin&apos; oracle source appear here. Pyth-resolved markets are handled automatically.
                </p>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <Skeleton key={i} className="h-[160px] rounded-[var(--radius-lg)]" />
                        ))}
                    </div>
                ) : manualMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {manualMarkets.map((market) => (
                            <AdminMarketCard key={market.id} market={market} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-[var(--text-secondary)] text-[13px] bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)]">
                        No manual markets pending resolution.
                    </div>
                )}
            </div>
        </div>
    );
}
