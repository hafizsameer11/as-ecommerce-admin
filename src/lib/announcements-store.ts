import { create } from "zustand";
import { announcementsAdminApi } from "@/lib/api/cms";

export type AnnStatus = "live" | "scheduled" | "paused" | "expired";
export type AnnStyle = "solid" | "gradient" | "outline" | "minimal";
export type AnnPlacement = "site_top" | "checkout_top" | "admin_top";
export type AnnAudience = "everyone" | "guests" | "members" | "club_gold" | "club_signature";
export type AnnDevice = "all" | "mobile" | "desktop";

export type Announcement = {
  id: string;
  title: string;
  message: string;
  emoji?: string;
  ctaLabel?: string;
  ctaHref?: string;
  style: AnnStyle;
  bg: string;
  fg: string;
  placement: AnnPlacement;
  audience: AnnAudience;
  device: AnnDevice;
  dismissible: boolean;
  priority: number;
  startsAt?: string;
  endsAt?: string;
  status: AnnStatus;
  impressions: number;
  clicks: number;
  dismisses: number;
  updatedAt: string;
};

function mapAnn(a: Record<string, unknown>): Announcement {
  const status = (["live", "scheduled", "paused", "expired"].includes(String(a.status))
    ? String(a.status)
    : "paused") as AnnStatus;
  return {
    id: String(a.id),
    title: String(a.title ?? ""),
    message: String(a.message ?? ""),
    emoji: a.emoji ? String(a.emoji) : undefined,
    ctaLabel: a.ctaLabel ? String(a.ctaLabel) : undefined,
    ctaHref: a.ctaHref ? String(a.ctaHref) : undefined,
    style: (a.style as AnnStyle) || "solid",
    bg: String(a.bg ?? "#0d0d0d"),
    fg: String(a.fg ?? "#ffffff"),
    placement: (a.placement as AnnPlacement) || "site_top",
    audience: (a.audience as AnnAudience) || "everyone",
    device: (a.device as AnnDevice) || "all",
    dismissible: a.dismissible !== false,
    priority: Number(a.priority ?? 1),
    startsAt: a.startsAt ? new Date(a.startsAt as string).toISOString() : undefined,
    endsAt: a.endsAt ? new Date(a.endsAt as string).toISOString() : undefined,
    status,
    impressions: Number(a.impressions ?? 0),
    clicks: Number(a.clicks ?? 0),
    dismisses: Number(a.dismisses ?? 0),
    updatedAt: a.updatedAt ? new Date(a.updatedAt as string).toISOString() : new Date().toISOString(),
  };
}

function toBody(patch: Partial<Announcement>) {
  const body: Record<string, unknown> = {};
  if ("title" in patch) body.title = patch.title;
  if ("message" in patch) body.message = patch.message;
  if ("emoji" in patch) body.emoji = patch.emoji ?? null;
  if ("ctaLabel" in patch) body.ctaLabel = patch.ctaLabel ?? null;
  if ("ctaHref" in patch) body.ctaHref = patch.ctaHref ?? null;
  if ("style" in patch) body.style = patch.style;
  if ("bg" in patch) body.bg = patch.bg;
  if ("fg" in patch) body.fg = patch.fg;
  if ("placement" in patch) body.placement = patch.placement;
  if ("audience" in patch) body.audience = patch.audience;
  if ("device" in patch) body.device = patch.device;
  if ("dismissible" in patch) body.dismissible = patch.dismissible;
  if ("priority" in patch) body.priority = patch.priority;
  if ("startsAt" in patch) body.startsAt = patch.startsAt ?? null;
  if ("endsAt" in patch) body.endsAt = patch.endsAt ?? null;
  if ("status" in patch) body.status = patch.status;
  return body;
}

type State = {
  items: Announcement[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: () => Promise<string>;
  update: (id: string, patch: Partial<Announcement>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  setStatus: (id: string, status: AnnStatus) => Promise<void>;
  reset: () => void;
};

export const useAnnouncements = create<State>()((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await announcementsAdminApi.list({ pageSize: 100 });
      set({ items: (data as Record<string, unknown>[]).map(mapAnn), hydrated: true });
    } catch (err) {
      console.warn("[announcements] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async () => {
    try {
      const created = mapAnn(
        (await announcementsAdminApi.create({
          title: "New announcement",
          message: "Your message here.",
          status: "paused",
        })) as Record<string, unknown>,
      );
      set((st) => ({ items: [created, ...st.items] }));
      return created.id;
    } catch (err) {
      console.warn("[announcements] create", err);
      await get().hydrate();
      return "";
    }
  },
  update: async (id, patch) => {
    set((st) => ({
      items: st.items.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a,
      ),
    }));
    try {
      const updated = mapAnn((await announcementsAdminApi.update(id, toBody(patch))) as Record<string, unknown>);
      set((st) => ({ items: st.items.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[announcements] update", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    set((st) => ({ items: st.items.filter((a) => a.id !== id) }));
    try {
      await announcementsAdminApi.remove(id);
    } catch (err) {
      console.warn("[announcements] remove", err);
      await get().hydrate();
    }
  },
  duplicate: async (id) => {
    try {
      const copy = mapAnn((await announcementsAdminApi.duplicate(id)) as Record<string, unknown>);
      set((st) => ({ items: [copy, ...st.items] }));
    } catch (err) {
      console.warn("[announcements] duplicate", err);
      await get().hydrate();
    }
  },
  setStatus: async (id, status) => {
    set((st) => ({
      items: st.items.map((a) =>
        a.id === id ? { ...a, status, updatedAt: new Date().toISOString() } : a,
      ),
    }));
    try {
      const updated = mapAnn(
        (await announcementsAdminApi.setStatus(id, status)) as Record<string, unknown>,
      );
      set((st) => ({ items: st.items.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[announcements] setStatus", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
