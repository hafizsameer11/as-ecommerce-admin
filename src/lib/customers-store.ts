import { create } from "zustand";
import { ordersAdminApi, koboToNaira, nairaToKobo, type AdminCustomerRow } from "@/lib/api/orders";
import { ApiError } from "@/lib/api/client";
import { toast } from "sonner";

export type CustomerTier = "Signature" | "Gold" | "Silver" | "Standard";
export type CustomerStatus = "active" | "vip" | "flagged" | "blocked";

export type CustomerAddress = {
  label: string;
  line1: string;
  city: string;
  state: string;
  country: string;
};

export type CustomerNote = {
  id: string;
  author: string;
  at: string;
  body: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  tier: CustomerTier;
  status: CustomerStatus;
  orders: number;
  concierge: number;
  spend: number;
  aov: number;
  walletBalance: number;
  loyaltyPoints: number;
  lastOrderAt: string;
  createdAt: string;
  marketingOptIn: boolean;
  addresses: CustomerAddress[];
  notes: CustomerNote[];
  tags: string[];
};

function mapCustomer(c: AdminCustomerRow): Customer {
  const statusRaw = (c.status || "active").toLowerCase();
  const status: CustomerStatus =
    statusRaw === "vip" || statusRaw === "flagged" || statusRaw === "blocked"
      ? (statusRaw as CustomerStatus)
      : "active";
  const tier = (["Signature", "Gold", "Silver", "Standard"].includes(c.tier)
    ? c.tier
    : "Standard") as CustomerTier;
  return {
    id: c.id,
    name: c.name || `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
    email: c.email,
    phone: c.phone || "",
    city: c.city || "",
    country: c.country || "",
    tier,
    status,
    orders: c.orders ?? 0,
    concierge: c.concierge ?? 0,
    spend: koboToNaira(c.spend ?? 0),
    aov: koboToNaira(c.aov ?? 0),
    walletBalance: koboToNaira(c.walletBalance ?? 0),
    loyaltyPoints: c.loyaltyPoints ?? 0,
    lastOrderAt: c.lastOrderAt ? new Date(c.lastOrderAt).toISOString() : "",
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
    marketingOptIn: c.marketingOptIn !== false,
    addresses: (c.addresses ?? []).map((a) => ({
      label: a.label,
      line1: a.line1,
      city: a.city,
      state: a.state,
      country: a.country,
    })),
    notes: (c.notes ?? []).map((n) => ({
      id: n.id,
      author: n.author,
      at: typeof n.at === "string" ? n.at : new Date(n.at).toISOString(),
      body: n.body,
    })),
    tags: c.tags ?? [],
  };
}

export type CustomerListMeta = {
  tabs?: Record<string, number>;
  kpis?: Record<string, unknown>;
  pageCount?: number;
  total?: number;
};

type HydrateQuery = {
  page?: number;
  pageSize?: number;
  tab?: string;
  q?: string;
};

type State = {
  customers: Customer[];
  listMeta: CustomerListMeta;
  hydrated: boolean;
  hydrate: (query?: HydrateQuery) => Promise<void>;
  setStatus: (id: string, s: CustomerStatus) => Promise<void>;
  setTier: (id: string, t: CustomerTier) => Promise<void>;
  toggleMarketing: (id: string) => Promise<void>;
  addNote: (id: string, body: string, author?: string) => Promise<void>;
  removeNote: (id: string, noteId: string) => Promise<void>;
  addTag: (id: string, tag: string) => Promise<void>;
  removeTag: (id: string, tag: string) => Promise<void>;
  adjustWallet: (id: string, delta: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
};

export const useCustomers = create<State>()((set, get) => ({
  customers: [],
  listMeta: {},
  hydrated: false,
  hydrate: async (query) => {
    try {
      const { data, meta } = await ordersAdminApi.listCustomers({
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? 50,
        tab: query?.tab,
        q: query?.q,
      });
      set({
        customers: data.map(mapCustomer),
        listMeta: {
          tabs: meta?.tabs as Record<string, number> | undefined,
          kpis: meta?.kpis as Record<string, unknown> | undefined,
          pageCount: Number(meta?.pageCount ?? 1),
          total: Number(meta?.total ?? data.length),
        },
        hydrated: true,
      });
    } catch (err) {
      console.warn("[customers] hydrate failed", err);
      toast.error(err instanceof ApiError ? err.message : "Failed to load customers");
      set({ hydrated: true });
    }
  },
  setStatus: async (id, s) => {
    set((st) => ({
      customers: st.customers.map((c) => (c.id === id ? { ...c, status: s } : c)),
    }));
    try {
      await ordersAdminApi.setCustomerStatus(id, s);
    } catch (err) {
      console.warn("[customers] status sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not update status");
      await get().hydrate();
    }
  },
  setTier: async (id, t) => {
    set((st) => ({
      customers: st.customers.map((c) => (c.id === id ? { ...c, tier: t } : c)),
    }));
    try {
      await ordersAdminApi.setCustomerTier(id, t);
    } catch (err) {
      console.warn("[customers] tier sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not update tier");
      await get().hydrate();
    }
  },
  toggleMarketing: async (id) => {
    const cur = get().customers.find((c) => c.id === id);
    const next = !(cur?.marketingOptIn ?? true);
    set((st) => ({
      customers: st.customers.map((c) => (c.id === id ? { ...c, marketingOptIn: next } : c)),
    }));
    try {
      await ordersAdminApi.setCustomerMarketing(id, next);
    } catch (err) {
      console.warn("[customers] marketing sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not update marketing preference");
      await get().hydrate();
    }
  },
  addNote: async (id, body, author = "Admin") => {
    set((st) => ({
      customers: st.customers.map((c) =>
        c.id === id
          ? {
              ...c,
              notes: [
                { id: `n_${Date.now().toString(36)}`, author, at: new Date().toISOString(), body },
                ...c.notes,
              ],
            }
          : c
      ),
    }));
    try {
      await ordersAdminApi.addCustomerNote(id, body);
      await get().hydrate();
    } catch (err) {
      console.warn("[customers] note sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not save note");
      await get().hydrate();
    }
  },
  removeNote: async (id, noteId) => {
    set((st) => ({
      customers: st.customers.map((c) =>
        c.id === id ? { ...c, notes: c.notes.filter((n) => n.id !== noteId) } : c
      ),
    }));
    try {
      await ordersAdminApi.removeCustomerNote(id, noteId);
    } catch (err) {
      console.warn("[customers] remove note sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not remove note");
      await get().hydrate();
    }
  },
  addTag: async (id, tag) => {
    set((st) => ({
      customers: st.customers.map((c) =>
        c.id === id && !c.tags.includes(tag) ? { ...c, tags: [...c.tags, tag] } : c
      ),
    }));
    try {
      await ordersAdminApi.addCustomerTag(id, tag);
    } catch (err) {
      console.warn("[customers] tag sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not add tag");
      await get().hydrate();
    }
  },
  removeTag: async (id, tag) => {
    set((st) => ({
      customers: st.customers.map((c) =>
        c.id === id ? { ...c, tags: c.tags.filter((t) => t !== tag) } : c
      ),
    }));
    try {
      await ordersAdminApi.removeCustomerTag(id, tag);
    } catch (err) {
      console.warn("[customers] remove tag sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not remove tag");
      await get().hydrate();
    }
  },
  adjustWallet: async (id, delta) => {
    set((st) => ({
      customers: st.customers.map((c) =>
        c.id === id ? { ...c, walletBalance: Math.max(0, c.walletBalance + delta) } : c
      ),
    }));
    try {
      const kind = delta >= 0 ? "credit" : "debit";
      const amountKobo = nairaToKobo(Math.abs(delta));
      await ordersAdminApi.adjustCustomerWallet(id, amountKobo, kind, "Admin adjustment");
      await get().hydrate();
    } catch (err) {
      console.warn("[customers] wallet sync", err);
      toast.error(err instanceof ApiError ? err.message : "Wallet adjustment failed");
      await get().hydrate();
    }
  },
  remove: async (id) => {
    try {
      await ordersAdminApi.removeCustomer(id);
      set((st) => ({ customers: st.customers.filter((c) => c.id !== id) }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not remove customer");
      throw err;
    }
  },
  reset: () => void get().hydrate(),
}));
