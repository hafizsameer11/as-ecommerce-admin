import { create } from "zustand";
import { collectionsAdminApi } from "@/lib/api/catalog-admin";

export type CollectionStatus = "active" | "scheduled" | "draft" | "archived";
export type CollectionType = "manual" | "smart";
export type CollectionSlot =
  | "hero"
  | "home_row_1"
  | "home_row_2"
  | "shop_hub"
  | "none";

export type SmartRule = {
  id: string;
  field: "category" | "brand" | "price" | "availability" | "subcategory";
  op: "is" | "is_not" | "gt" | "lt" | "contains";
  value: string;
};

export type Collection = {
  id: string;
  title: string;
  handle: string;
  description: string;
  status: CollectionStatus;
  type: CollectionType;
  slot: CollectionSlot;
  productIds: string[];
  rules: SmartRule[];
  coverImage?: string;
  featured: boolean;
  publishedAt?: string;
  scheduledFor?: string;
  updatedAt: string;
  createdAt: string;
  tags: string[];
  sortOrder: "manual" | "newest" | "price_asc" | "price_desc" | "bestseller";
};

function iso(v: unknown): string | undefined {
  if (!v) return undefined;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function mapRule(r: Record<string, unknown>, i: number): SmartRule {
  return {
    id: String(r.id ?? `r${i}`),
    field: (r.field as SmartRule["field"]) || "category",
    op: (r.op as SmartRule["op"]) || "is",
    value: String(r.value ?? ""),
  };
}

function mapCollection(c: Record<string, unknown>): Collection {
  const rulesRaw = Array.isArray(c.rules) ? (c.rules as Record<string, unknown>[]) : [];
  const productIds = Array.isArray(c.productIds) ? (c.productIds as string[]).map(String) : [];
  const cover = c.coverImage ?? c.cover ?? c.coverUrl;
  return {
    id: String(c.id),
    title: String(c.title ?? ""),
    handle: String(c.handle ?? ""),
    description: String(c.description ?? ""),
    status: (c.status as CollectionStatus) || "draft",
    type: (c.type as CollectionType) || "manual",
    slot: (c.slot as CollectionSlot) || "none",
    productIds,
    rules: rulesRaw.map(mapRule),
    coverImage: cover ? String(cover) : undefined,
    featured: !!c.featured,
    publishedAt: iso(c.publishedAt),
    scheduledFor: iso(c.scheduledFor),
    updatedAt: iso(c.updatedAt) ?? new Date().toISOString(),
    createdAt: iso(c.createdAt) ?? new Date().toISOString(),
    tags: Array.isArray(c.tags) ? (c.tags as string[]).map(String) : [],
    sortOrder: (c.sortOrder as Collection["sortOrder"]) || "manual",
  };
}

function toBody(patch: Partial<Collection>) {
  const out: Record<string, unknown> = {};
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.handle !== undefined) out.handle = patch.handle;
  if (patch.description !== undefined) out.description = patch.description;
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.type !== undefined) out.type = patch.type;
  if (patch.slot !== undefined) out.slot = patch.slot;
  if (patch.rules !== undefined) {
    out.rules = patch.rules.map(({ field, op, value }) => ({ field, op, value }));
  }
  if (patch.productIds !== undefined) out.productIds = patch.productIds;
  if (patch.coverImage !== undefined) out.coverUrl = patch.coverImage;
  if (patch.featured !== undefined) out.featured = patch.featured;
  if (patch.sortOrder !== undefined) out.sortOrder = patch.sortOrder;
  if (patch.tags !== undefined) out.tags = patch.tags;
  if (patch.scheduledFor !== undefined) out.scheduledFor = patch.scheduledFor;
  return out;
}

type State = {
  collections: Collection[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setStatus: (id: string, status: CollectionStatus) => Promise<void>;
  setSlot: (id: string, slot: CollectionSlot) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  update: (id: string, patch: Partial<Collection>) => Promise<void>;
  reset: () => void;
};

export const useCollections = create<State>()((set, get) => ({
  collections: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await collectionsAdminApi.list();
      set({ collections: (data as Record<string, unknown>[]).map(mapCollection), hydrated: true });
    } catch (err) {
      console.warn("[collections] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  setStatus: async (id, status) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              publishedAt: status === "active" ? new Date().toISOString() : c.publishedAt,
              updatedAt: new Date().toISOString(),
            }
          : c,
      ),
    }));
    try {
      const updated = mapCollection(
        (await collectionsAdminApi.update(id, { status })) as Record<string, unknown>,
      );
      set((s) => ({ collections: s.collections.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[collections] status sync", err);
      await get().hydrate();
    }
  },
  setSlot: async (id, slot) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, slot, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCollection(
        (await collectionsAdminApi.update(id, { slot })) as Record<string, unknown>,
      );
      set((s) => ({ collections: s.collections.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[collections] slot sync", err);
      await get().hydrate();
    }
  },
  toggleFeatured: async (id) => {
    const cur = get().collections.find((c) => c.id === id);
    if (!cur) return;
    const featured = !cur.featured;
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, featured, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCollection(
        (await collectionsAdminApi.update(id, { featured })) as Record<string, unknown>,
      );
      set((s) => ({ collections: s.collections.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[collections] featured sync", err);
      await get().hydrate();
    }
  },
  duplicate: async (id) => {
    try {
      const copy = mapCollection((await collectionsAdminApi.duplicate(id)) as Record<string, unknown>);
      set((s) => ({ collections: [copy, ...s.collections] }));
    } catch (err) {
      console.warn("[collections] duplicate sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await collectionsAdminApi.remove(id);
    set((s) => ({ collections: s.collections.filter((c) => c.id !== id) }));
  },
  update: async (id, patch) => {
    set((s) => ({
      collections: s.collections.map((c) =>
        c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c,
      ),
    }));
    try {
      const updated = mapCollection(
        (await collectionsAdminApi.update(id, toBody(patch))) as Record<string, unknown>,
      );
      set((s) => ({ collections: s.collections.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[collections] update sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
