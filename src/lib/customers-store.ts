import { create } from "zustand";
import { ordersAdminApi, koboToNaira, type AdminCustomerRow } from "@/lib/api/orders";

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

type State = {
  customers: Customer[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
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
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await ordersAdminApi.listCustomers({ pageSize: 100 });
      set({ customers: data.map(mapCustomer), hydrated: true });
    } catch (err) {
      console.warn("[customers] hydrate failed", err);
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
      await ordersAdminApi.adjustCustomerWallet(id, delta, "Admin adjustment");
      await get().hydrate();
    } catch (err) {
      console.warn("[customers] wallet sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await ordersAdminApi.removeCustomer(id);
    set((st) => ({ customers: st.customers.filter((c) => c.id !== id) }));
  },
  reset: () => void get().hydrate(),
}));
