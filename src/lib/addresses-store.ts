import { create } from "zustand";
import { ordersAdminApi } from "@/lib/api/orders";

export type AddressType = "shipping" | "billing" | "pickup";

export type Address = {
  id: string;
  customerId: string;
  customerName: string;
  label: string;
  type: AddressType;
  recipient: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  isDefault: boolean;
  verified: boolean;
  flagged: boolean;
  ordersShipped: number;
  lastUsedAt: string;
  createdAt: string;
  notes?: string;
};

function mapAddress(a: Record<string, unknown>): Address {
  return {
    id: String(a.id),
    customerId: String(a.customerId ?? ""),
    customerName: String(a.customerName ?? ""),
    label: String(a.label ?? "Home"),
    type: (a.type as AddressType) || "shipping",
    recipient: String(a.recipient ?? ""),
    phone: String(a.phone ?? ""),
    line1: String(a.line1 ?? ""),
    line2: a.line2 ? String(a.line2) : undefined,
    city: String(a.city ?? ""),
    state: String(a.state ?? ""),
    country: String(a.country ?? ""),
    postalCode: String(a.postalCode ?? ""),
    isDefault: !!a.isDefault,
    verified: !!a.verified,
    flagged: !!a.flagged,
    ordersShipped: Number(a.ordersShipped ?? 0),
    lastUsedAt: a.lastUsedAt
      ? new Date(a.lastUsedAt as string).toISOString()
      : new Date().toISOString(),
    createdAt: a.createdAt
      ? new Date(a.createdAt as string).toISOString()
      : new Date().toISOString(),
    notes: a.notes ? String(a.notes) : undefined,
  };
}

type State = {
  addresses: Address[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  update: (id: string, patch: Partial<Address>) => Promise<void>;
  toggleVerified: (id: string) => Promise<void>;
  toggleFlag: (id: string) => Promise<void>;
  setDefault: (customerId: string, id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
};

export const useAddresses = create<State>()((set, get) => ({
  addresses: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await ordersAdminApi.listAddresses({ pageSize: 100 });
      set({ addresses: (data as Record<string, unknown>[]).map(mapAddress), hydrated: true });
    } catch (err) {
      console.warn("[addresses] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  update: async (id, patch) => {
    set((s) => ({
      addresses: s.addresses.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
    try {
      const res = (await ordersAdminApi.updateAddress(id, {
        label: patch.label,
        type: patch.type,
        recipient: patch.recipient,
        phone: patch.phone,
        line1: patch.line1,
        line2: patch.line2 ?? null,
        city: patch.city,
        state: patch.state,
        country: patch.country,
        postalCode: patch.postalCode ?? null,
        notes: patch.notes ?? null,
      })) as Record<string, unknown>;
      const row = (res.after ?? res) as Record<string, unknown>;
      const updated = mapAddress(row);
      set((s) => ({ addresses: s.addresses.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[addresses] update sync", err);
      await get().hydrate();
    }
  },
  toggleVerified: async (id) => {
    const cur = get().addresses.find((a) => a.id === id);
    if (!cur) return;
    if (cur.verified) {
      // API only marks verified; un-verify via patch if needed — optimistic local only then rehydrate
      set((s) => ({
        addresses: s.addresses.map((a) => (a.id === id ? { ...a, verified: false } : a)),
      }));
      return;
    }
    set((s) => ({
      addresses: s.addresses.map((a) => (a.id === id ? { ...a, verified: true } : a)),
    }));
    try {
      const updated = mapAddress((await ordersAdminApi.verifyAddress(id)) as Record<string, unknown>);
      set((s) => ({ addresses: s.addresses.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[addresses] verify sync", err);
      await get().hydrate();
    }
  },
  toggleFlag: async (id) => {
    const cur = get().addresses.find((a) => a.id === id);
    if (!cur) return;
    const next = !cur.flagged;
    set((s) => ({
      addresses: s.addresses.map((a) => (a.id === id ? { ...a, flagged: next } : a)),
    }));
    try {
      const updated = mapAddress((await ordersAdminApi.flagAddress(id, next)) as Record<string, unknown>);
      set((s) => ({ addresses: s.addresses.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[addresses] flag sync", err);
      await get().hydrate();
    }
  },
  setDefault: async (_customerId, id) => {
    const cur = get().addresses.find((a) => a.id === id);
    if (!cur) return;
    set((s) => ({
      addresses: s.addresses.map((a) =>
        a.customerId === cur.customerId ? { ...a, isDefault: a.id === id } : a,
      ),
    }));
    try {
      await ordersAdminApi.setDefaultAddress(id);
      await get().hydrate();
    } catch (err) {
      console.warn("[addresses] default sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await ordersAdminApi.removeAddress(id);
    set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) }));
  },
  reset: () => void get().hydrate(),
}));
