import { create } from "zustand";

type QuickViewState = {
  productId: string | null;
  open: (productId: string) => void;
  close: () => void;
};

export const useQuickView = create<QuickViewState>((set) => ({
  productId: null,
  open: (productId) => set({ productId }),
  close: () => set({ productId: null }),
}));
