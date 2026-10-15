import { create } from "zustand";
import { bannersAdminApi } from "@/lib/api/cms";

export type BannerPlacement =
  | "top_bar"
  | "checkout"
  | "cart_nudge"
  | "category_ribbon"
  | "product_ribbon"
  | "concierge_strip";

export type BannerStatus = "live" | "scheduled" | "paused" | "draft" | "expired";
export type BannerDevice = "all" | "mobile" | "desktop";
export type BannerAudience = "all" | "guest" | "member" | "vip";
export type BannerStyle = "solid" | "gradient" | "outline";

export type Banner = {
  id: string;
  name: string;
  placement: BannerPlacement;
  priority: number;
  status: BannerStatus;
  device: BannerDevice;
  audience: BannerAudience;
  message: string;
  cta?: string;
  linkTo?: string;
  bg: string;
  fg: string;
  accent: string;
  style: BannerStyle;
  dismissible: boolean;
  icon?: "sparkles" | "gift" | "truck" | "flame" | "crown" | "none";
  startsAt: string;
  endsAt?: string;
  impressions: number;
  clicks: number;
  dismissals: number;
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

function mapBanner(b: Record<string, unknown>): Banner {
  return {
    id: String(b.id),
    name: String(b.name ?? ""),
    placement: (b.placement as BannerPlacement) || "top_bar",
    priority: Number(b.priority ?? 1),
    status: (b.status as BannerStatus) || "draft",
    device: (b.device as BannerDevice) || "all",
    audience: (b.audience as BannerAudience) || "all",
    message: String(b.message ?? ""),
    cta: b.cta ? String(b.cta) : undefined,
    linkTo: b.linkTo ? String(b.linkTo) : undefined,
    bg: String(b.bg ?? "#0f0f0f"),
    fg: String(b.fg ?? "#faf6ea"),
    accent: String(b.accent ?? "#c9a86a"),
    style: (b.style as BannerStyle) || "solid",
    dismissible: b.dismissible !== false,
    icon: (b.icon as Banner["icon"]) || "none",
    startsAt: b.startsAt ? new Date(b.startsAt as string).toISOString() : new Date().toISOString(),
    endsAt: b.endsAt ? new Date(b.endsAt as string).toISOString() : undefined,
    impressions: Number(b.impressions ?? 0),
    clicks: Number(b.clicks ?? 0),
    dismissals: Number(b.dismissals ?? 0),
    createdAt: b.createdAt ? new Date(b.createdAt as string).toISOString() : new Date().toISOString(),
    updatedAt: b.updatedAt ? new Date(b.updatedAt as string).toISOString() : new Date().toISOString(),
    notes: b.notes ? String(b.notes) : undefined,
  };
}

function toBody(b: Partial<Banner>) {
  return {
    name: b.name,
    placement: b.placement,
    priority: b.priority,
    status: b.status,
    device: b.device,
    audience: b.audience,
    message: b.message,
    cta: b.cta ?? null,
    linkTo: b.linkTo ?? null,
    bg: b.bg,
    fg: b.fg,
    accent: b.accent,
    style: b.style,
    icon: b.icon ?? null,
    dismissible: b.dismissible,
    startsAt: b.startsAt ?? null,
    endsAt: b.endsAt ?? null,
    notes: b.notes ?? null,
  };
}

type State = {
  banners: Banner[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (b: Omit<Banner, "id" | "impressions" | "clicks" | "dismissals" | "createdAt" | "updatedAt">) => Promise<Banner>;
  update: (id: string, patch: Partial<Banner>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Banner | undefined>;
  setStatus: (id: string, status: BannerStatus) => Promise<void>;
  reorder: (placement: BannerPlacement, orderedIds: string[]) => Promise<void>;
  move: (id: string, dir: "up" | "down") => Promise<void>;
  reset: () => void;
};

export const useBanners = create<State>()((set, get) => ({
  banners: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await bannersAdminApi.list({ pageSize: 100 });
      set({ banners: (data as Record<string, unknown>[]).map(mapBanner), hydrated: true });
    } catch (err) {
      console.warn("[banners] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (payload) => {
    const created = mapBanner((await bannersAdminApi.create(toBody(payload))) as Record<string, unknown>);
    set((st) => ({ banners: [created, ...st.banners] }));
    return created;
  },
  update: async (id, patch) => {
    set((st) => ({
      banners: st.banners.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x)),
    }));
    try {
      const updated = mapBanner((await bannersAdminApi.update(id, toBody(patch))) as Record<string, unknown>);
      set((st) => ({ banners: st.banners.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[banners] update sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await bannersAdminApi.remove(id);
    set((st) => ({ banners: st.banners.filter((x) => x.id !== id) }));
  },
  duplicate: async (id) => {
    const copy = mapBanner((await bannersAdminApi.duplicate(id)) as Record<string, unknown>);
    set((st) => ({ banners: [copy, ...st.banners] }));
    return copy;
  },
  setStatus: async (id, status) => {
    set((st) => ({
      banners: st.banners.map((x) => (x.id === id ? { ...x, status, updatedAt: new Date().toISOString() } : x)),
    }));
    try {
      const updated = mapBanner((await bannersAdminApi.setStatus(id, status)) as Record<string, unknown>);
      set((st) => ({ banners: st.banners.map((x) => (x.id === id ? updated : x)) }));
    } catch (err) {
      console.warn("[banners] status sync", err);
      await get().hydrate();
    }
  },
  reorder: async (placement, orderedIds) => {
    set((st) => ({
      banners: st.banners.map((x) => {
        if (x.placement !== placement) return x;
        const idx = orderedIds.indexOf(x.id);
        return idx >= 0 ? { ...x, priority: idx + 1, updatedAt: new Date().toISOString() } : x;
      }),
    }));
    try {
      const rows = (await bannersAdminApi.reorder(placement, orderedIds)) as Record<string, unknown>[];
      const mapped = rows.map(mapBanner);
      set((st) => ({
        banners: [
          ...mapped,
          ...st.banners.filter((b) => b.placement !== placement),
        ],
      }));
    } catch (err) {
      console.warn("[banners] reorder sync", err);
      await get().hydrate();
    }
  },
  move: async (id, dir) => {
    try {
      const rows = (await bannersAdminApi.move(id, dir)) as Record<string, unknown>[];
      const mapped = rows.map(mapBanner);
      const placement = mapped[0]?.placement;
      set((st) => ({
        banners: placement
          ? [...mapped, ...st.banners.filter((b) => b.placement !== placement)]
          : st.banners,
      }));
    } catch (err) {
      console.warn("[banners] move sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
