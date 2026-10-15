import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMyCoupons } from "./my-coupons-store";


export type DeliveryMethod = "ship" | "pickup";
export type PaymentMethod = "paystack" | "bank" | "card";

export type CheckoutAddress = {
  fullName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  postal: string;
  country: string;
};

export type CheckoutContact = {
  email: string;
  phone: string;
  subscribe: boolean;
};

type CheckoutState = {
  contact: CheckoutContact;
  address: CheckoutAddress;
  delivery: DeliveryMethod;
  payment: PaymentMethod;
  coupon: string | null;
  discountPct: number; // e.g. 20
  setContact: (patch: Partial<CheckoutContact>) => void;
  setAddress: (patch: Partial<CheckoutAddress>) => void;
  setDelivery: (m: DeliveryMethod) => void;
  setPayment: (m: PaymentMethod) => void;
  applyCoupon: (code: string) => { ok: boolean; pct: number; message: string };
  removeCoupon: () => void;
};

const initialContact: CheckoutContact = {
  email: "",
  phone: "",
  subscribe: false,
};

const initialAddress: CheckoutAddress = {
  fullName: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  postal: "",
  country: "",
};

export const useCheckout = create<CheckoutState>()(
  persist(
    (set) => ({
      contact: initialContact,
      address: initialAddress,
      delivery: "ship",
      payment: "paystack",
      coupon: null,
      discountPct: 0,
      setContact: (patch) => set((s) => ({ contact: { ...s.contact, ...patch } })),
      setAddress: (patch) => set((s) => ({ address: { ...s.address, ...patch } })),
      setDelivery: (m) => set({ delivery: m }),
      setPayment: (m) => set({ payment: m }),
      applyCoupon: (raw) => {
        const code = raw.trim().toUpperCase();
        if (!code) return { ok: false, pct: 0, message: "Enter a coupon code" };
        const user = useMyCoupons.getState().find(code);
        const pct = user?.pct;
        if (!pct) {
          set({ coupon: null, discountPct: 0 });
          return { ok: false, pct: 0, message: "Invalid coupon code" };
        }
        set({ coupon: code, discountPct: pct });
        return { ok: true, pct, message: `${pct}% off applied` };
      },



      removeCoupon: () => set({ coupon: null, discountPct: 0 }),
    }),
    { name: "asl-checkout" }
  )
);

export const SHIP_FEE_BY_STATE: Record<string, number> = {
  Lagos: 4000,
  Abuja: 5000,
  Other: 6000,
};

export function shippingFor(delivery: DeliveryMethod, state: string): number {
  if (delivery === "pickup") return 0;
  if (state.toLowerCase().includes("lagos")) return SHIP_FEE_BY_STATE.Lagos;
  if (state.toLowerCase().includes("abuja") || state.toLowerCase().includes("fct"))
    return SHIP_FEE_BY_STATE.Abuja;
  return SHIP_FEE_BY_STATE.Other;
}
