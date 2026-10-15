import { create } from "zustand";
import { persist } from "zustand/middleware";

type State = {
  recents: string[];
  add: (q: string) => void;
  removeOne: (q: string) => void;
  clear: () => void;
};

const useStore = create<State>()(
  persist(
    (set) => ({
      recents: ["White sneakers", "Black hoodie", "Fragrance for men"],
      add: (q) =>
        set((s) => ({
          recents: [q, ...s.recents.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8),
        })),
      removeOne: (q) => set((s) => ({ recents: s.recents.filter((x) => x !== q) })),
      clear: () => set({ recents: [] }),
    }),
    { name: "asl-recent-searches" }
  )
);

export const useRecentSearches = () => useStore();
