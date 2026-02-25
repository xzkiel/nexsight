'use client';

import { cn } from '@/lib/cn';
import { FileText, Activity } from 'lucide-react';

interface MarketTabsProps {
    activeTab: 'overview' | 'activity';
    onTabChange: (tab: 'overview' | 'activity') => void;
}

export function MarketTabs({ activeTab, onTabChange }: MarketTabsProps) {
    const tabs = [
        { id: 'overview', label: 'Overview', icon: FileText },
        { id: 'activity', label: 'Activity', icon: Activity },
    ] as const;

    return (
        <div className="flex items-center gap-1">
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={cn(
                            "px-3 py-1.5 rounded-[var(--radius-sm)] text-[13px] font-medium transition-all flex items-center gap-1.5",
                            isActive
                                ? "bg-[var(--bg-tertiary)] text-white border border-[var(--border)]"
                                : "text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-tertiary)]"
                        )}
                    >
                        <Icon size={14} />
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
