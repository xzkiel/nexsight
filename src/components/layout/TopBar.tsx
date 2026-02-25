'use client';

import { Search } from '@/components/ui/Icons';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import { NEXSIGHT_MINT } from '@/lib/constants';

export function TopBar() {
  const [copied, setCopied] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleCopyMint = () => {
    if (!NEXSIGHT_MINT) return;
    navigator.clipboard.writeText(NEXSIGHT_MINT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-30 h-14 bg-[var(--bg-base)] border-b border-[var(--border)] flex items-center justify-between px-5 gap-4">
      {/* Search */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={15} />
          <input
            type="text"
            placeholder="Search markets..."
            className="w-full h-9 pl-9 pr-4 bg-[var(--bg-input)] border border-[var(--border)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--pump-border)] focus:ring-1 focus:ring-[var(--green-glow-border)] transition-colors"
          />
        </div>
      </div>

      {/* Right actions: $NEX | Select Wallet */}
      <div className="flex items-center gap-2">
        {/* $NEX — click to copy mint */}
        <button
          onClick={handleCopyMint}
          title={NEXSIGHT_MINT ? `Copy mint: ${NEXSIGHT_MINT}` : '$NEX'}
          className="wallet-adapter-button wallet-adapter-button-trigger"
        >
          {copied ? 'Copied!' : '$NEX'}
        </button>

        {/* Wallet */}
        {isMounted ? (
          <WalletMultiButton />
        ) : (
          <div className="h-7 w-[100px] bg-[var(--bg-card)] rounded-[var(--radius-sm)] animate-pulse" />
        )}
      </div>
    </header>
  );
}
