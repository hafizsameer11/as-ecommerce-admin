import { create } from "zustand";

type QuickAddState = {
  productId: string | null;
  open: (productId: string) => void;
  close: () => void;
};

export const useQuickAdd = create<QuickAddState>((set) => ({
  productId: null,
  open: (productId) => set({ productId }),
  close: () => set({ productId: null }),
}));
