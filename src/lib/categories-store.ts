import { create } from "zustand";
import { categoriesAdminApi } from "@/lib/api/catalog-admin";

export type CategoryStatus = "active" | "hidden" | "draft";

export type Subcategory = {
  id: string;
  name: string;
  handle: string;
  productCount: number;
  status: CategoryStatus;
  updatedAt: string;
};

export type Category = {
  id: string;
  name: string;
  handle: string;
  description: string;
  status: CategoryStatus;
  featured: boolean;
  order: number;
  image?: string;
  icon?: string;
  subcategories: Subcategory[];
  updatedAt: string;
  createdAt: string;
  seoTitle?: string;
  seoDescription?: string;
};

function iso(v: unknown): string {
  if (!v) return new Date().toISOString();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function mapSub(s: Record<string, unknown>): Subcategory {
  return {
    id: String(s.id),
    name: String(s.name ?? ""),
    handle: String(s.handle ?? ""),
    productCount: Number(s.productCount ?? 0),
    status: (s.status as CategoryStatus) || "active",
    updatedAt: iso(s.updatedAt),
  };
}

function mapCategory(c: Record<string, unknown>): Category {
  const subs = Array.isArray(c.subcategories)
    ? (c.subcategories as Record<string, unknown>[]).map(mapSub)
    : [];
  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    handle: String(c.handle ?? ""),
    description: String(c.description ?? ""),
    status: (c.status as CategoryStatus) || "draft",
    featured: !!c.featured,
    order: Number(c.position ?? c.order ?? 0),
    image: c.image ? String(c.image) : undefined,
    icon: c.icon ? String(c.icon) : undefined,
    subcategories: subs,
    updatedAt: iso(c.updatedAt),
    createdAt: iso(c.createdAt),
    seoTitle: c.seoTitle ? String(c.seoTitle) : undefined,
    seoDescription: c.seoDescription ? String(c.seoDescription) : undefined,
  };
}

function toPatch(patch: Partial<Category>) {
  const out: Record<string, unknown> = {};
  if (patch.name !== undefined) out.name = patch.name;
  if (patch.handle !== undefined) out.handle = patch.handle;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.image !== undefined) out.image = patch.image;
  if (patch.icon !== undefined) out.icon = patch.icon;
  if (patch.featured !== undefined) out.featured = patch.featured;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.seoTitle !== undefined) out.seoTitle = patch.seoTitle;
  if (patch.seoDescription !== undefined) out.seoDescription = patch.seoDescription;
  return out;
}

type State = {
  categories: Category[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setStatus: (id: string, status: CategoryStatus) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  reorder: (id: string, dir: "up" | "down") => Promise<void>;
  update: (id: string, patch: Partial<Category>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  addSubcategory: (id: string, name: string) => Promise<void>;
  removeSubcategory: (id: string, subId: string) => Promise<void>;
  setSubStatus: (id: string, subId: string, status: CategoryStatus) => Promise<void>;
  addCategory: (name: string) => Promise<void>;
  reset: () => void;
};

export const useCategories = create<State>()((set, get) => ({
  categories: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const rows = await categoriesAdminApi.list();
      set({ categories: (rows as Record<string, unknown>[]).map(mapCategory), hydrated: true });
    } catch (err) {
      console.warn("[categories] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  setStatus: async (id, status) => {
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, status, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCategory(
        (await categoriesAdminApi.update(id, { status })) as Record<string, unknown>,
      );
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[categories] status sync", err);
      await get().hydrate();
    }
  },
  toggleFeatured: async (id) => {
    const cur = get().categories.find((c) => c.id === id);
    if (!cur) return;
    const featured = !cur.featured;
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, featured, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCategory(
        (await categoriesAdminApi.update(id, { featured })) as Record<string, unknown>,
      );
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[categories] featured sync", err);
      await get().hydrate();
    }
  },
  reorder: async (id, dir) => {
    // Optimistic local swap
    set((s) => {
      const list = [...s.categories].sort((a, b) => a.order - b.order);
      const i = list.findIndex((c) => c.id === id);
      const j = dir === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= list.length) return s;
      const a = list[i].order;
      list[i] = { ...list[i], order: list[j].order };
      list[j] = { ...list[j], order: a };
      return { categories: list };
    });
    try {
      const rows = (await categoriesAdminApi.move(id, dir)) as Record<string, unknown>[];
      set({ categories: rows.map(mapCategory) });
    } catch (err) {
      console.warn("[categories] reorder sync", err);
      await get().hydrate();
    }
  },
  update: async (id, patch) => {
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCategory(
        (await categoriesAdminApi.update(id, toPatch(patch))) as Record<string, unknown>,
      );
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[categories] update sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await categoriesAdminApi.remove(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },
  addSubcategory: async (id, name) => {
    try {
      const updated = mapCategory(
        (await categoriesAdminApi.addSub(id, { name })) as Record<string, unknown>,
      );
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[categories] addSub sync", err);
      await get().hydrate();
    }
  },
  removeSubcategory: async (id, subId) => {
    try {
      const updated = mapCategory(
        (await categoriesAdminApi.removeSub(id, subId)) as Record<string, unknown>,
      );
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[categories] removeSub sync", err);
      await get().hydrate();
    }
  },
  setSubStatus: async (id, subId, status) => {
    set((s) => ({
      categories: s.categories.map((c) =>
        c.id === id
          ? {
              ...c,
              updatedAt: new Date().toISOString(),
              subcategories: c.subcategories.map((x) =>
                x.id === subId ? { ...x, status, updatedAt: new Date().toISOString() } : x,
              ),
            }
          : c,
      ),
    }));
    try {
      const updated = mapCategory(
        (await categoriesAdminApi.updateSub(id, subId, { status })) as Record<string, unknown>,
      );
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[categories] subStatus sync", err);
      await get().hydrate();
    }
  },
  addCategory: async (name) => {
    try {
      const created = mapCategory((await categoriesAdminApi.create({ name })) as Record<string, unknown>);
      set((s) => ({ categories: [...s.categories, created] }));
    } catch (err) {
      console.warn("[categories] create sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
