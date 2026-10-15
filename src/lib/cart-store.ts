import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  variant: string;
  size?: string;
  color?: string;
  qty: number;
  price: number;
  image: string;
};

type CartState = {
  items: CartItem[];
  add: (item: Omit<CartItem, "id" | "qty"> & { qty?: number }) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const key = `${item.productId}-${item.size ?? ""}-${item.color ?? ""}`;
          const qty = item.qty ?? 1;
          const existing = s.items.find((x) => x.id === key);
          if (existing) {
            return {
              items: s.items.map((x) =>
                x.id === key ? { ...x, qty: x.qty + qty } : x
              ),
            };
          }
          return { items: [...s.items, { ...item, id: key, qty }] };
        }),
      setQty: (id, qty) =>
        set((s) => ({
          items: s.items.map((x) => (x.id === id ? { ...x, qty: Math.max(1, Math.min(10, qty)) } : x)),
        })),
      remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
      clear: () => set({ items: [] }),
    }),
    { name: "asl-cart" }
  )
);

export const useCartCount = () =>
  useCart((s) => s.items.reduce((n, x) => n + x.qty, 0));
export const useCartSubtotal = () =>
  useCart((s) => s.items.reduce((n, x) => n + x.qty * x.price, 0));
