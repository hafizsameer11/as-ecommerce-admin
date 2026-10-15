import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistVariation = { size?: string; color?: string };

type WishlistState = {
  ids: string[];
  variations: Record<string, WishlistVariation>;
  toggle: (id: string, variation?: WishlistVariation) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      variations: {},
      toggle: (id, variation) =>
        set((s) => {
          if (s.ids.includes(id)) {
            const variations = { ...s.variations };
            delete variations[id];
            return { ids: s.ids.filter((x) => x !== id), variations };
          }
          return {
            ids: [...s.ids, id],
            variations: { ...s.variations, [id]: variation ?? {} },
          };
        }),
      remove: (id) =>
        set((s) => {
          const variations = { ...s.variations };
          delete variations[id];
          return { ids: s.ids.filter((x) => x !== id), variations };
        }),
      has: (id) => get().ids.includes(id),
    }),
    { name: "asl-wishlist" }
  )
);

export const useWishlistCount = () => useWishlist((s) => s.ids.length);
export const useIsWished = (id: string) =>
  useWishlist((s) => s.ids.includes(id));
export const useWishlistVariation = (id: string) =>
  useWishlist((s) => s.variations[id]);
