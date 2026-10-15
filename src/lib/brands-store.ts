import { create } from "zustand";
import { brandsAdminApi } from "@/lib/api/catalog-admin";
export type BrandStatus = "active" | "draft" | "archived";
export type BrandTier = "signature" | "core" | "emerging";

export type Brand = {
  id: string;
  name: string;
  handle: string;
  tagline: string;
  description: string;
  country: string;
  tier: BrandTier;
  status: BrandStatus;
  featured: boolean;
  logoInitial: string;
  accent: string; // hex
  website?: string;
  concierge_only: boolean;
  createdAt: string;
  updatedAt: string;
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  /** Active product count from API when available */
  itemCount?: number;
  logoUrl?: string | null;
};

function iso(v: unknown): string {
  if (!v) return new Date().toISOString();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function mapBrand(b: Record<string, unknown>): Brand {
  return {
    id: String(b.id),
    name: String(b.name ?? ""),
    handle: String(b.handle ?? ""),
    tagline: String(b.tagline ?? ""),
    description: String(b.description ?? ""),
    country: String(b.country ?? " - "),
    tier: (b.tier as BrandTier) || "core",
    status: (b.status as BrandStatus) || "draft",
    featured: !!b.featured,
    logoInitial: String(b.logoInitial ?? (String(b.name ?? "").slice(0, 2).toUpperCase())),
    accent: String(b.accent ?? "#8a6a1c"),
    website: b.website ? String(b.website) : undefined,
    concierge_only: !!(b.conciergeOnly ?? b.concierge_only),
    createdAt: iso(b.createdAt),
    updatedAt: iso(b.updatedAt),
    seoTitle: b.seoTitle ? String(b.seoTitle) : undefined,
    seoDescription: b.seoDescription ? String(b.seoDescription) : undefined,
    itemCount: typeof b.itemCount === "number" ? b.itemCount : undefined,
    logoUrl: b.logoUrl != null ? String(b.logoUrl) : null,
  };
}

function toBody(b: Partial<Brand> & { name?: string }) {
  const out: Record<string, unknown> = {};
  if (b.name !== undefined) out.name = b.name;
  if (b.handle !== undefined) out.handle = b.handle;
  if (b.tagline !== undefined) out.tagline = b.tagline;
  if (b.description !== undefined) out.description = b.description;
  if (b.country !== undefined) out.country = b.country;
  if (b.tier !== undefined) out.tier = b.tier;
  if (b.status !== undefined) out.status = b.status;
  if (b.featured !== undefined) out.featured = b.featured;
  if (b.concierge_only !== undefined) out.conciergeOnly = b.concierge_only;
  if (b.logoUrl !== undefined) out.logoUrl = b.logoUrl;
  if (b.logoInitial !== undefined) out.logoInitial = b.logoInitial;
  if (b.accent !== undefined) out.accent = b.accent;
  if (b.website !== undefined) out.website = b.website;
  if (b.seoTitle !== undefined) out.seoTitle = b.seoTitle;
  if (b.seoDescription !== undefined) out.seoDescription = b.seoDescription;
  return out;
}

export function productCountForBrand(name: string): number {
  const hit = useBrands.getState().brands.find((b) => b.name.toUpperCase() === name.toUpperCase());
  if (hit && typeof hit.itemCount === "number") return hit.itemCount;
  return 0;
}

type State = {
  brands: Brand[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setStatus: (id: string, s: BrandStatus) => Promise<void>;
  setTier: (id: string, t: BrandTier) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  toggleConciergeOnly: (id: string) => Promise<void>;
  update: (id: string, patch: Partial<Brand>) => Promise<void>;
  create: (b: Partial<Brand> & { name: string }) => Promise<string>;
  duplicate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
};

export const useBrands = create<State>()((set, get) => ({
  brands: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await brandsAdminApi.list();
      set({ brands: (data as Record<string, unknown>[]).map(mapBrand), hydrated: true });
    } catch (err) {
      console.warn("[brands] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  setStatus: async (id, s) => {
    set((st) => ({
      brands: st.brands.map((b) => (b.id === id ? { ...b, status: s, updatedAt: new Date().toISOString() } : b)),
    }));
    try {
      const updated = mapBrand((await brandsAdminApi.update(id, { status: s })) as Record<string, unknown>);
      set((st) => ({ brands: st.brands.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[brands] status sync", err);
      await get().hydrate();
    }
  },
  setTier: async (id, t) => {
    set((st) => ({
      brands: st.brands.map((b) => (b.id === id ? { ...b, tier: t, updatedAt: new Date().toISOString() } : b)),
    }));
    try {
      const updated = mapBrand((await brandsAdminApi.update(id, { tier: t })) as Record<string, unknown>);
      set((st) => ({ brands: st.brands.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[brands] tier sync", err);
      await get().hydrate();
    }
  },
  toggleFeatured: async (id) => {
    const cur = get().brands.find((b) => b.id === id);
    if (!cur) return;
    const featured = !cur.featured;
    set((st) => ({
      brands: st.brands.map((b) => (b.id === id ? { ...b, featured, updatedAt: new Date().toISOString() } : b)),
    }));
    try {
      const updated = mapBrand((await brandsAdminApi.update(id, { featured })) as Record<string, unknown>);
      set((st) => ({ brands: st.brands.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[brands] featured sync", err);
      await get().hydrate();
    }
  },
  toggleConciergeOnly: async (id) => {
    const cur = get().brands.find((b) => b.id === id);
    if (!cur) return;
    const concierge_only = !cur.concierge_only;
    set((st) => ({
      brands: st.brands.map((b) =>
        b.id === id ? { ...b, concierge_only, updatedAt: new Date().toISOString() } : b,
      ),
    }));
    try {
      const updated = mapBrand(
        (await brandsAdminApi.update(id, { conciergeOnly: concierge_only })) as Record<string, unknown>,
      );
      set((st) => ({ brands: st.brands.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[brands] concierge sync", err);
      await get().hydrate();
    }
  },
  update: async (id, patch) => {
    set((st) => ({
      brands: st.brands.map((b) => (b.id === id ? { ...b, ...patch, updatedAt: new Date().toISOString() } : b)),
    }));
    try {
      const updated = mapBrand((await brandsAdminApi.update(id, toBody(patch))) as Record<string, unknown>);
      set((st) => ({ brands: st.brands.map((b) => (b.id === id ? updated : b)) }));
    } catch (err) {
      console.warn("[brands] update sync", err);
      await get().hydrate();
    }
  },
  create: async (b) => {
    const created = mapBrand((await brandsAdminApi.create(toBody(b))) as Record<string, unknown>);
    set((st) => ({ brands: [created, ...st.brands] }));
    return created.id;
  },
  duplicate: async (id) => {
    try {
      const copy = mapBrand((await brandsAdminApi.duplicate(id)) as Record<string, unknown>);
      set((st) => ({ brands: [copy, ...st.brands] }));
    } catch (err) {
      console.warn("[brands] duplicate sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await brandsAdminApi.remove(id);
    set((st) => ({ brands: st.brands.filter((b) => b.id !== id) }));
  },
  reset: () => void get().hydrate(),
}));
