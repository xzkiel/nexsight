import { create } from 'zustand';

interface UiStore {
    isSidebarOpen: boolean;
    activeModal: string | null;
    toggleSidebar: () => void;
    openModal: (id: string) => void;
    closeModal: () => void;
}

export const useUiStore = create<UiStore>((set) => ({
    isSidebarOpen: false,
    activeModal: null,
    toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
    openModal: (id) => set({ activeModal: id }),
    closeModal: () => set({ activeModal: null }),
}));
