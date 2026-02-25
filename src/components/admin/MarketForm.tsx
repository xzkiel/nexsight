'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { getProgram, getProvider } from '@/services/anchor';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { toast } from 'sonner';
import { COLLATERAL_MINT } from '@/lib/constants';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PYTH_FEED_OPTIONS } from '@/lib/pyth-feeds';

type OracleSourceType = 'manualAdmin' | 'pyth';

export function MarketForm() {
    const { connected, publicKey, signTransaction, signAllTransactions } = useWallet();
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [endStr, setEndStr] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const [oracleSource, setOracleSource] = useState<OracleSourceType>('manualAdmin');
    const [pythFeed, setPythFeed] = useState(PYTH_FEED_OPTIONS[0]?.value || '');
    const [customFeed, setCustomFeed] = useState('');
    const [threshold, setThreshold] = useState('');

    const [isInitLoading, setIsInitLoading] = useState(false);

    const handleInitPlatform = async () => {
        if (!connected || !publicKey || !signTransaction) {
            toast.error("Connect wallet");
            return;
        }
        try {
            setIsInitLoading(true);
            const provider = getProvider({ publicKey, signTransaction, signAllTransactions });
            if (!provider) throw new Error("Provider issue");
            const program = getProgram(provider);

            const [platformConfig] = PublicKey.findProgramAddressSync(
                [Buffer.from("platform_config")],
                program.programId
            );

            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const treasury = await getAssociatedTokenAddress(
                collateralMint,
                publicKey
            );

            await program.methods.initPlatform(200, new BN(1000000))
                .accounts({
                    collateralMint,
                    treasury: treasury,
                })
                .rpc();

            toast.success("Platform Initialized!");

        } catch (e: any) {
            console.error(e);
            toast.error("Init Error: " + e.message);
        } finally {
            setIsInitLoading(false);
        }
    };

    const [isUpdatingMint, setIsUpdatingMint] = useState(false);

    const handleUpdateCollateralMint = async () => {
        if (!connected || !publicKey || !signTransaction) {
            toast.error("Connect wallet");
            return;
        }
        try {
            setIsUpdatingMint(true);
            const provider = getProvider({ publicKey, signTransaction, signAllTransactions });
            if (!provider) throw new Error("Provider issue");
            const program = getProgram(provider);

            const newCollateralMint = new PublicKey(COLLATERAL_MINT);

            const newTreasury = await getAssociatedTokenAddress(
                newCollateralMint,
                publicKey
            );

            await program.methods.updateCollateralMint()
                .accounts({
                    newCollateralMint,
                    newTreasury,
                })
                .rpc();

            toast.success("Collateral mint updated to wSOL!");
        } catch (e: any) {
            console.error(e);
            toast.error("Update Error: " + e.message);
        } finally {
            setIsUpdatingMint(false);
        }
    };

    const handleCreate = async () => {
        if (!connected || !publicKey || !signTransaction) {
            toast.error("Connect wallet");
            return;
        }

        try {
            setIsLoading(true);
            const provider = getProvider({ publicKey, signTransaction, signAllTransactions });
            if (!provider) throw new Error("Provider issue");
            const program = getProgram(provider);

            const marketId = new BN(Date.now());
            const [marketPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("market"), marketId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            const [yesMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("yes_mint"), marketPda.toBuffer()],
                program.programId
            );
            const [noMint] = PublicKey.findProgramAddressSync(
                [Buffer.from("no_mint"), marketPda.toBuffer()],
                program.programId
            );
            const [vault] = PublicKey.findProgramAddressSync(
                [Buffer.from("vault"), marketPda.toBuffer()],
                program.programId
            );
            const [platformConfig] = PublicKey.findProgramAddressSync(
                [Buffer.from("platform_config")],
                program.programId
            );

            const endDate = endStr ? new Date(endStr) : new Date(Date.now() + 3600000);
            const endTs = new BN(Math.floor(endDate.getTime() / 1000));

            const collateralMint = new PublicKey(COLLATERAL_MINT);
            const adminAta = await getAssociatedTokenAddress(collateralMint, publicKey);

            let oracleSourceArg: { manualAdmin: {} } | { pyth: {} };
            let oracleFeedPubkey: PublicKey;
            let oracleThresholdBn: BN;

            if (oracleSource === 'pyth') {
                oracleSourceArg = { pyth: {} };
                const feedAddress = customFeed || pythFeed;
                if (!feedAddress) {
                    toast.error("Please select or enter a Pyth feed address");
                    setIsLoading(false);
                    return;
                }
                try {
                    oracleFeedPubkey = new PublicKey(feedAddress);
                } catch {
                    toast.error("Invalid Pyth feed address");
                    setIsLoading(false);
                    return;
                }
                const thresholdNum = parseFloat(threshold) || 0;
                oracleThresholdBn = new BN(Math.floor(thresholdNum * 1e8));
            } else {
                oracleSourceArg = { manualAdmin: {} };
                oracleFeedPubkey = PublicKey.default;
                oracleThresholdBn = new BN(0);
            }

            const params = {
                title: title || "New Market",
                description: desc || "Description",
                category: { crypto: {} },
                oracleSource: oracleSourceArg,
                oracleFeed: oracleFeedPubkey,
                oracleThreshold: oracleThresholdBn,
                startTimestamp: new BN(Math.floor(Date.now() / 1000)),
                endTimestamp: endTs,
                lockTimestamp: new BN(endTs.toNumber() - 3600),
                minBet: new BN(10_000_000),
                maxBet: new BN(0),
                isRecurring: false,
                roundDuration: null,
                feeBps: 200,
            };

            await program.methods.createMarket(marketId, params)
                .accounts({
                    adminAta,
                })
                .rpc();

            toast.success("Market Created! ID: " + marketId.toString());
            setTitle('');
            setDesc('');
            setThreshold('');
        } catch (e: any) {
            console.error(e);
            toast.error("Error: " + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    const inputClass = "w-full px-3 py-2 h-9 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-input)] text-[13px] text-white focus:outline-none focus:border-[var(--pump-color)] transition-colors placeholder:text-[var(--text-muted)]";
    const labelClass = "text-[12px] font-medium text-[var(--text-secondary)] mb-1 block";

    return (
        <div className="space-y-4">
            {/* Platform Init Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                <h2 className="text-[14px] font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--pump-color)]"></span>
                    Platform Setup
                </h2>
                <p className="text-[12px] text-[var(--text-muted)] mb-3">
                    Initialize the platform before creating markets
                </p>
                <div className="flex gap-2">
                    <button
                        disabled={isInitLoading}
                        onClick={handleInitPlatform}
                        className="px-4 py-2 bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-[13px] rounded-[var(--radius-md)] border border-[var(--border)] hover:bg-[var(--border)] transition-colors font-medium disabled:opacity-50"
                    >
                        {isInitLoading ? "Initializing..." : "Initialize Platform"}
                    </button>
                    <button
                        disabled={isUpdatingMint}
                        onClick={handleUpdateCollateralMint}
                        className="px-4 py-2 bg-orange-500/10 text-orange-400 text-[13px] rounded-[var(--radius-md)] border border-orange-500/20 hover:bg-orange-500/20 transition-colors font-medium disabled:opacity-50"
                    >
                        {isUpdatingMint ? "Updating..." : "Update Mint"}
                    </button>
                </div>
            </div>

            {/* Create Market Card */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5">
                <h2 className="text-[14px] font-semibold text-white mb-4 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--pump-color)]"></span>
                    Create Market
                </h2>

                <div className="space-y-3">
                    <div>
                        <label className={labelClass}>Title</label>
                        <input
                            className={inputClass}
                            placeholder="e.g., Will BTC hit $100k by 2025?"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea
                            className="w-full px-3 py-2 border border-[var(--border)] rounded-[var(--radius-md)] bg-[var(--bg-input)] text-[13px] text-white focus:outline-none focus:border-[var(--pump-color)] transition-colors placeholder:text-[var(--text-muted)] min-h-[80px] resize-none"
                            placeholder="Describe the market resolution criteria..."
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>End Date</label>
                        <input
                            className={inputClass}
                            type="datetime-local"
                            value={endStr}
                            onChange={e => setEndStr(e.target.value)}
                        />
                    </div>

                    {/* Oracle Config */}
                    <div className="border-t border-[var(--border)] pt-3">
                        <h3 className="text-[12px] font-semibold text-[var(--text-secondary)] mb-3">Oracle Configuration</h3>
                        <div>
                            <label className={labelClass}>Resolution Method</label>
                            <select
                                className={inputClass}
                                value={oracleSource}
                                onChange={e => setOracleSource(e.target.value as OracleSourceType)}
                            >
                                <option value="manualAdmin">Manual (Admin Resolves)</option>
                                <option value="pyth">Pyth Network (Automated)</option>
                            </select>
                        </div>
                    </div>

                    {/* Pyth-specific inputs */}
                    {oracleSource === 'pyth' && (
                        <div className="space-y-3 p-3 rounded-[var(--radius-md)] bg-[var(--sol-purple-bg)] border border-[var(--sol-purple)]/20">
                            <div className="flex items-center gap-2 text-[var(--sol-purple)] text-[12px] font-medium">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Pyth Network Settings
                            </div>
                            <div>
                                <label className={labelClass}>Price Feed</label>
                                <select
                                    className={inputClass}
                                    value={pythFeed}
                                    onChange={e => {
                                        setPythFeed(e.target.value);
                                        setCustomFeed('');
                                    }}
                                >
                                    {PYTH_FEED_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className={labelClass}>Custom Feed Address</label>
                                <input
                                    className={`${inputClass} font-mono text-[11px]`}
                                    placeholder="Or paste a custom Pyth feed pubkey..."
                                    value={customFeed}
                                    onChange={e => setCustomFeed(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Price Threshold (USD)</label>
                                <input
                                    className={inputClass}
                                    type="number"
                                    placeholder="e.g., 100000 for $100,000"
                                    value={threshold}
                                    onChange={e => setThreshold(e.target.value)}
                                />
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                    Market resolves YES if price &ge; threshold at end time
                                </p>
                            </div>
                        </div>
                    )}

                    <button
                        disabled={isLoading}
                        onClick={handleCreate}
                        className="w-full py-2.5 bg-[var(--pump-color)] text-black text-[13px] rounded-[var(--radius-md)] font-semibold hover:bg-[var(--pump-color-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Creating..." : "Create Market"}
                    </button>
                </div>
            </div>
        </div>
    );
}
