import { create } from "zustand";
import { persist } from "zustand/middleware";

export type MintedCoupon = {
  code: string;
  pct: number;
  label: string;
  source: "rewards" | "promo" | "referral";
};

export function mintCouponCode(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

type State = {
  coupons: MintedCoupon[];
  add: (c: MintedCoupon) => void;
  find: (code: string) => MintedCoupon | undefined;
  remove: (code: string) => void;
};

export const useMyCoupons = create<State>()(
  persist(
    (set, get) => ({
      coupons: [],
      add: (c) => set((s) => s.coupons.some((x) => x.code === c.code) ? s : { coupons: [c, ...s.coupons] }),
      find: (code) => get().coupons.find((c) => c.code.toUpperCase() === code.toUpperCase()),
      remove: (code) => set((s) => ({ coupons: s.coupons.filter((c) => c.code !== code) })),
    }),
    { name: "asl-my-coupons-v1" }
  )
);
