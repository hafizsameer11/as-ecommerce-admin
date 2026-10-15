import { create } from "zustand";
import { slotsAdminApi } from "@/lib/api/marketing";
import { koboToNaira } from "@/lib/api/client";

export type SlotType = "hero" | "banner" | "grid" | "carousel" | "editorial" | "countdown";
export type SlotPage = "home" | "shop" | "sales" | "concierge" | "brands";
export type SlotStatus = "live" | "scheduled" | "paused" | "draft" | "expired";
export type SlotDevice = "all" | "mobile" | "desktop";
export type SlotAudience = "all" | "guest" | "member" | "vip";

export type Slot = {
  id: string;
  name: string;
  page: SlotPage;
  position: number;
  type: SlotType;
  status: SlotStatus;
  device: SlotDevice;
  audience: SlotAudience;
  headline: string;
  subhead?: string;
  cta?: string;
  linkTo?: string;
  imageColor: string;
  accent: string;
  startsAt: string;
  endsAt?: string;
  impressions: number;
  clicks: number;
  revenue: number;
  pinned: boolean;
  updatedAt: string;
  createdAt: string;
  notes?: string;
};

function mapSlot(s: Record<string, unknown>): Slot {
  return {
    id: String(s.id),
    name: String(s.name ?? ""),
    page: (s.page as SlotPage) || "home",
    position: Number(s.position ?? 1),
    type: (s.type as SlotType) || "hero",
    status: (s.status as SlotStatus) || "draft",
    device: (s.device as SlotDevice) || "all",
    audience: (s.audience as SlotAudience) || "all",
    headline: String(s.headline ?? ""),
    subhead: s.subhead ? String(s.subhead) : undefined,
    cta: s.cta ? String(s.cta) : undefined,
    linkTo: s.linkTo ? String(s.linkTo) : undefined,
    imageColor: String(s.imageColor ?? "#1a1a1a"),
    accent: String(s.accent ?? "#c9a86a"),
    startsAt: s.startsAt ? new Date(s.startsAt as string).toISOString() : new Date().toISOString(),
    endsAt: s.endsAt ? new Date(s.endsAt as string).toISOString() : undefined,
    impressions: Number(s.impressions ?? 0),
    clicks: Number(s.clicks ?? 0),
    revenue: koboToNaira(Number(s.revenue ?? 0)),
    pinned: !!s.pinned,
    updatedAt: s.updatedAt ? new Date(s.updatedAt as string).toISOString() : new Date().toISOString(),
    createdAt: s.createdAt ? new Date(s.createdAt as string).toISOString() : new Date().toISOString(),
    notes: s.notes ? String(s.notes) : undefined,
  };
}

function toBody(s: Partial<Slot>) {
  return {
    name: s.name,
    page: s.page,
    position: s.position,
    type: s.type,
    status: s.status,
    device: s.device,
    audience: s.audience,
    headline: s.headline,
    subhead: s.subhead ?? null,
    cta: s.cta ?? null,
    linkTo: s.linkTo ?? null,
    imageColor: s.imageColor ?? null,
    accent: s.accent ?? null,
    startsAt: s.startsAt ?? null,
    endsAt: s.endsAt ?? null,
    pinned: s.pinned,
    notes: s.notes ?? null,
  };
}

type State = {
  slots: Slot[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (s: Omit<Slot, "id" | "impressions" | "clicks" | "revenue" | "createdAt" | "updatedAt" | "pinned">) => Promise<Slot>;
  update: (id: string, patch: Partial<Slot>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Slot | undefined>;
  setStatus: (id: string, status: SlotStatus) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  reorder: (page: SlotPage, orderedIds: string[]) => Promise<void>;
  move: (id: string, dir: "up" | "down") => Promise<void>;
  reset: () => void;
};

export const useSlots = create<State>()((set, get) => ({
  slots: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await slotsAdminApi.list({ pageSize: 100 });
      set({ slots: (data as Record<string, unknown>[]).map(mapSlot), hydrated: true });
    } catch (err) {
      console.warn("[slots] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (payload) => {
    const created = mapSlot((await slotsAdminApi.create(toBody(payload))) as Record<string, unknown>);
    set((st) => ({ slots: [created, ...st.slots] }));
    return created;
  },
  update: async (id, patch) => {
    set((st) => ({
      slots: st.slots.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)),
    }));
    try {
      const res = (await slotsAdminApi.update(id, toBody(patch))) as Record<string, unknown>;
      const row = (res.after ?? res) as Record<string, unknown>;
      const updated = mapSlot(row);
      set((st) => ({ slots: st.slots.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[slots] update sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await slotsAdminApi.remove(id);
    set((st) => ({ slots: st.slots.filter((x) => x.id !== id) }));
  },
  duplicate: async (id) => {
    const copy = mapSlot((await slotsAdminApi.duplicate(id)) as Record<string, unknown>);
    set((st) => ({ slots: [copy, ...st.slots] }));
    return copy;
  },
  setStatus: async (id, status) => {
    set((st) => ({
      slots: st.slots.map((x) => (x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x)),
    }));
    try {
      const res = (await slotsAdminApi.setStatus(id, status)) as Record<string, unknown>;
      const row = (res.after ?? res) as Record<string, unknown>;
      const updated = mapSlot(row);
      set((st) => ({ slots: st.slots.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[slots] status sync", err);
      await get().hydrate();
    }
  },
  togglePin: async (id) => {
    set((st) => ({
      slots: st.slots.map((x) => (x.id === id ? { ...x, pinned: !x.pinned } : x)),
    }));
    try {
      const updated = mapSlot((await slotsAdminApi.togglePin(id)) as Record<string, unknown>);
      set((st) => ({ slots: st.slots.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[slots] pin sync", err);
      await get().hydrate();
    }
  },
  reorder: async (page, orderedIds) => {
    set((st) => ({
      slots: st.slots.map((x) => {
        if (x.page !== page) return x;
        const idx = orderedIds.indexOf(x.id);
        return idx >= 0 ? { ...x, position: idx + 1, updatedAt: new Date().toISOString() } : x;
      }),
    }));
    try {
      const rows = (await slotsAdminApi.reorder(page, orderedIds)) as Record<string, unknown>[];
      const mapped = rows.map(mapSlot);
      set((st) => ({
        slots: [...mapped, ...st.slots.filter((s) => s.page !== page)],
      }));
    } catch (err) {
      console.warn("[slots] reorder sync", err);
      await get().hydrate();
    }
  },
  move: async (id, dir) => {
    try {
      const rows = (await slotsAdminApi.move(id, dir)) as Record<string, unknown>[];
      const mapped = rows.map(mapSlot);
      const page = mapped[0]?.page;
      set((st) => ({
        slots: page ? [...mapped, ...st.slots.filter((s) => s.page !== page)] : st.slots,
      }));
    } catch (err) {
      console.warn("[slots] move sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
