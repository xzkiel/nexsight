'use client';

import { useState } from 'react';
import { useCreateMarket } from '@/hooks/useCreateMarket';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Loader2, Plus } from '@/components/ui/Icons';
import { MarketCategory } from '@/types/market';

const CATEGORIES: MarketCategory[] = ['Crypto', 'Sports', 'Politics', 'Entertainment', 'Weather', 'Custom'];

export function CreateMarketForm() {
    const { mutate: createMarket, isPending } = useCreateMarket();
    const [isOpen, setIsOpen] = useState(false);

    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'Crypto' as MarketCategory,
        endDate: '',
        oracleSource: 'ManualAdmin' as 'ManualAdmin' | 'Pyth',
        initialLiquidity: '1',
    });

    const handleSubmit = () => {
        if (!form.title || !form.endDate) return;

        createMarket({
            title: form.title,
            description: form.description,
            category: form.category,
            endTimestamp: Math.floor(new Date(form.endDate).getTime() / 1000),
            oracleSource: form.oracleSource,
            initialLiquidity: parseFloat(form.initialLiquidity) || 1,
        }, {
            onSuccess: () => {
                setIsOpen(false);
                setForm({
                    title: '',
                    description: '',
                    category: 'Crypto',
                    endDate: '',
                    oracleSource: 'ManualAdmin',
                    initialLiquidity: '1',
                });
            }
        });
    };

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="w-full h-10 border border-dashed border-[var(--border)] hover:border-[var(--pump-color)] bg-transparent hover:bg-[var(--pump-bg)] text-[var(--text-secondary)] hover:text-[var(--pump-color)] transition-all"
            >
                <Plus size={16} className="mr-2" /> Create New Market
            </Button>
        );
    }

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[var(--radius-lg)] p-5 space-y-4">
            <h3 className="text-[15px] font-semibold text-white">Create New Market</h3>

            <div className="space-y-3">
                <div>
                    <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Title</label>
                    <Input
                        placeholder="e.g. Will SOL hit $200?"
                        value={form.title}
                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                </div>

                <div>
                    <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Description</label>
                    <textarea
                        className="w-full px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] text-[13px] text-white focus:outline-none focus:border-[var(--pump-color)] resize-none min-h-[72px] placeholder:text-[var(--text-muted)]"
                        placeholder="Describe the resolution criteria..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Category</label>
                        <select
                            className="w-full h-9 px-3 rounded-[var(--radius-md)] bg-[var(--bg-input)] border border-[var(--border)] text-[13px] text-white focus:outline-none focus:border-[var(--pump-color)]"
                            value={form.category}
                            onChange={(e) => setForm({ ...form, category: e.target.value as MarketCategory })}
                        >
                            {CATEGORIES.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">End Date</label>
                        <Input
                            type="datetime-local"
                            value={form.endDate}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Initial Liquidity (SOL)</label>
                    <Input
                        type="number"
                        placeholder="1.0"
                        min="0.01"
                        step="0.1"
                        value={form.initialLiquidity}
                        onChange={(e) => setForm({ ...form, initialLiquidity: e.target.value })}
                    />
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Seeds the CPMM pools. Higher liquidity = less slippage.</p>
                </div>

                <div>
                    <label className="text-[11px] text-[var(--text-secondary)] mb-1 block">Oracle Source</label>
                    <div className="flex gap-2">
                        <button
                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-medium border transition-all ${form.oracleSource === 'ManualAdmin' ? 'bg-[var(--pump-bg)] border-[var(--pump-border)] text-[var(--pump-color)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-white'}`}
                            onClick={() => setForm({ ...form, oracleSource: 'ManualAdmin' })}
                        >
                            Manual (Admin)
                        </button>
                        <button
                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-[12px] font-medium border transition-all ${form.oracleSource === 'Pyth' ? 'bg-[var(--sol-purple-bg)] border-[var(--sol-purple)] text-[var(--sol-purple)]' : 'border-[var(--border)] text-[var(--text-muted)] hover:text-white'}`}
                            onClick={() => setForm({ ...form, oracleSource: 'Pyth' })}
                        >
                            Pyth Oracle
                        </button>
                    </div>
                </div>

                <div className="flex gap-2 pt-1">
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => setIsOpen(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleSubmit}
                        disabled={isPending || !form.title || !form.endDate}
                    >
                        {isPending ? <Loader2 className="animate-spin" size={14} /> : 'Create Market'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
