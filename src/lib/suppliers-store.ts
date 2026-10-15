import { create } from "zustand";
import { suppliersAdminApi } from "@/lib/api/fulfilment";
import { koboToNaira } from "@/lib/api/client";

export type SupplierTier = "diamond" | "platinum" | "gold" | "silver";
export type SupplierStatus = "active" | "paused" | "blocked" | "pending";

export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  categories: string[];
  brands: string[];
  tier: SupplierTier;
  status: SupplierStatus;
  leadTimeDays: number;
  onTimeRate: number;
  fulfillmentRate: number;
  totalOrders: number;
  totalSpend: number;
  rating: number;
  paymentTerms: string;
  currency: "USD" | "EUR" | "GBP" | "NGN";
  vip: boolean;
  notes: string;
  createdAt: number;
  lastOrderAt?: number;
};

function mapSupplier(s: Record<string, unknown>): Supplier {
  const spend = Number(s.totalSpend ?? 0);
  const currencyRaw = String(s.currency || "USD");
  const currency = (
    ["USD", "EUR", "GBP", "NGN"].includes(currencyRaw) ? currencyRaw : "USD"
  ) as Supplier["currency"];
  return {
    id: String(s.id),
    name: String(s.name ?? ""),
    contact: String(s.contact ?? ""),
    email: String(s.email ?? ""),
    phone: String(s.phone ?? ""),
    country: String(s.country ?? ""),
    city: String(s.city ?? ""),
    categories: Array.isArray(s.categories) ? (s.categories as string[]) : [],
    brands: Array.isArray(s.brands) ? (s.brands as string[]) : [],
    tier: (s.tier as SupplierTier) || "silver",
    status: (s.status as SupplierStatus) || "pending",
    leadTimeDays: Number(s.leadTimeDays ?? 0),
    onTimeRate: Number(s.onTimeRate ?? 0),
    fulfillmentRate: Number(s.fulfillmentRate ?? 0),
    totalOrders: Number(s.totalOrders ?? 0),
    totalSpend: koboToNaira(spend),
    rating: Number(s.rating ?? 0),
    paymentTerms: String(s.paymentTerms ?? "Prepaid"),
    currency,
    vip: !!s.vip,
    notes: String(s.notes ?? ""),
    createdAt: s.createdAt ? new Date(s.createdAt as string).getTime() : Date.now(),
    lastOrderAt: s.lastOrderAt ? new Date(s.lastOrderAt as string).getTime() : undefined,
  };
}

type State = {
  suppliers: Supplier[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setStatus: (id: string, status: SupplierStatus) => Promise<void>;
  toggleVip: (id: string) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  add: (
    s: Omit<
      Supplier,
      "id" | "createdAt" | "totalOrders" | "totalSpend" | "onTimeRate" | "fulfillmentRate" | "rating"
    >,
  ) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useSuppliers = create<State>()((set, get) => ({
  suppliers: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await suppliersAdminApi.list({ pageSize: 100, tab: "all" });
      set({
        suppliers: ((data as Record<string, unknown>[]) ?? []).map(mapSupplier),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[suppliers] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  setStatus: async (id, status) => {
    set((s) => ({
      suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, status } : x)),
    }));
    try {
      const updated = mapSupplier(
        (await suppliersAdminApi.update(id, { status })) as Record<string, unknown>,
      );
      set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[suppliers] setStatus", err);
      await get().hydrate();
    }
  },
  toggleVip: async (id) => {
    set((s) => ({
      suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, vip: !x.vip } : x)),
    }));
    try {
      const updated = mapSupplier(
        (await suppliersAdminApi.toggleVip(id)) as Record<string, unknown>,
      );
      set((s) => ({ suppliers: s.suppliers.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[suppliers] toggleVip", err);
      await get().hydrate();
    }
  },
  updateNotes: async (id, notes) => {
    set((s) => ({
      suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, notes } : x)),
    }));
    try {
      await suppliersAdminApi.update(id, { notes });
    } catch (err) {
      console.warn("[suppliers] updateNotes", err);
      await get().hydrate();
    }
  },
  add: async (input) => {
    try {
      const created = mapSupplier(
        (await suppliersAdminApi.create({
          name: input.name,
          contact: input.contact,
          email: input.email,
          phone: input.phone,
          country: input.country,
          city: input.city,
          categories: input.categories,
          brands: input.brands,
          tier: input.tier,
          status: input.status,
          leadTimeDays: input.leadTimeDays,
          paymentTerms: input.paymentTerms,
          currency: input.currency,
          vip: input.vip,
          notes: input.notes || null,
        })) as Record<string, unknown>,
      );
      set((s) => ({ suppliers: [created, ...s.suppliers] }));
    } catch (err) {
      console.warn("[suppliers] add", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    set((s) => ({ suppliers: s.suppliers.filter((x) => x.id !== id) }));
    try {
      await suppliersAdminApi.remove(id);
    } catch (err) {
      console.warn("[suppliers] remove", err);
      await get().hydrate();
    }
  },
}));
