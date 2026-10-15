import { create } from "zustand";

/** Bumped after catalogue hydrate so memoized listings refresh. */
export const useCatalogVersion = create<{ v: number; bump: () => void }>((set) => ({
  v: 0,
  bump: () => set((s) => ({ v: s.v + 1 })),
}));
