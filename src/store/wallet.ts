import { create } from 'zustand';

interface WalletStore {
    address: string | null;
    balance: { sol: number } | null;
    setAddress: (addr: string | null) => void;
    setBalance: (bal: { sol: number } | null) => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
    address: null,
    balance: null,
    setAddress: (addr) => set({ address: addr }),
    setBalance: (bal) => set({ balance: bal }),
}));
