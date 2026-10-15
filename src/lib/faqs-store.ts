import { create } from "zustand";
import { faqsAdminApi } from "@/lib/api/cms";

export type FaqStatus = "published" | "draft" | "archived";

export type FaqCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon: string;   // lucide icon name (mapped in UI)
  order: number;
};

export type FaqItem = {
  id: string;
  categoryId: string;
  question: string;
  answer: string;
  status: FaqStatus;
  order: number;
  featured: boolean;
  tags: string[];
  views30d: number;
  helpful: number;
  notHelpful: number;
  updatedAt: string;
  author: string;
};

function iso(v: unknown): string {
  if (!v) return new Date().toISOString();
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function mapCategory(c: Record<string, unknown>): FaqCategory {
  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    slug: String(c.slug ?? ""),
    description: c.description ? String(c.description) : undefined,
    icon: String(c.icon ?? "HelpCircle"),
    order: Number(c.order ?? 0),
  };
}

function mapItem(i: Record<string, unknown>): FaqItem {
  return {
    id: String(i.id),
    categoryId: String(i.categoryId ?? ""),
    question: String(i.question ?? ""),
    answer: String(i.answer ?? ""),
    status: (i.status as FaqStatus) || "draft",
    order: Number(i.order ?? 0),
    featured: !!i.featured,
    tags: Array.isArray(i.tags) ? (i.tags as string[]) : [],
    views30d: Number(i.views30d ?? 0),
    helpful: Number(i.helpful ?? 0),
    notHelpful: Number(i.notHelpful ?? 0),
    updatedAt: iso(i.updatedAt),
    author: String(i.author ?? ""),
  };
}

type State = {
  categories: FaqCategory[];
  items: FaqItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;

  // categories
  addCategory: (name: string) => Promise<string>;
  updateCategory: (id: string, patch: Partial<FaqCategory>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;
  moveCategory: (id: string, dir: -1 | 1) => Promise<void>;

  // items
  addItem: (categoryId: string) => Promise<string>;
  updateItem: (id: string, patch: Partial<FaqItem>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  duplicateItem: (id: string) => Promise<void>;
  setItemStatus: (id: string, status: FaqStatus) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  moveItem: (id: string, dir: -1 | 1) => Promise<void>;

  reset: () => void;
};

export const useFaqs = create<State>()((set, get) => ({
  categories: [],
  items: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [cats, itemsRes] = await Promise.all([
        faqsAdminApi.categories(),
        faqsAdminApi.items({ pageSize: 500 }),
      ]);
      set({
        categories: (cats as Record<string, unknown>[]).map(mapCategory),
        items: (itemsRes.data as Record<string, unknown>[]).map(mapItem),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[faqs] hydrate failed", err);
      set({ hydrated: true });
    }
  },

  addCategory: async (name) => {
    const created = mapCategory((await faqsAdminApi.createCategory({ name })) as Record<string, unknown>);
    set((s) => ({ categories: [...s.categories, created] }));
    return created.id;
  },
  updateCategory: async (id, patch) => {
    set((s) => ({ categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
    try {
      const updated = mapCategory((await faqsAdminApi.updateCategory(id, patch)) as Record<string, unknown>);
      set((s) => ({ categories: s.categories.map((c) => (c.id === id ? updated : c)) }));
    } catch (err) {
      console.warn("[faqs] category update sync", err);
      await get().hydrate();
    }
  },
  removeCategory: async (id) => {
    await faqsAdminApi.removeCategory(id);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      items: s.items.filter((i) => i.categoryId !== id),
    }));
  },
  moveCategory: async (id, dir) => {
    // optimistic local swap; backend returns the full re-ordered list on success
    set((s) => {
      const sorted = [...s.categories].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((c) => c.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return s;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      return { categories: sorted.map((c, k) => ({ ...c, order: k })) };
    });
    try {
      const rows = (await faqsAdminApi.moveCategory(id, dir)) as Record<string, unknown>[];
      set({ categories: rows.map(mapCategory) });
    } catch (err) {
      console.warn("[faqs] category move sync", err);
      await get().hydrate();
    }
  },

  addItem: async (categoryId) => {
    const created = mapItem(
      (await faqsAdminApi.createItem({ categoryId, question: "New question" })) as Record<string, unknown>,
    );
    set((s) => ({ items: [...s.items, created] }));
    return created.id;
  },
  updateItem: async (id, patch) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i)),
    }));
    try {
      const updated = mapItem((await faqsAdminApi.updateItem(id, patch)) as Record<string, unknown>);
      set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
    } catch (err) {
      console.warn("[faqs] item update sync", err);
      await get().hydrate();
    }
  },
  removeItem: async (id) => {
    await faqsAdminApi.removeItem(id);
    set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
  },
  duplicateItem: async (id) => {
    const copy = mapItem((await faqsAdminApi.duplicateItem(id)) as Record<string, unknown>);
    set((s) => ({ items: [...s.items, copy] }));
  },
  setItemStatus: async (id, status) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i)),
    }));
    try {
      const updated = mapItem((await faqsAdminApi.setItemStatus(id, status)) as Record<string, unknown>);
      set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
    } catch (err) {
      console.warn("[faqs] item status sync", err);
      await get().hydrate();
    }
  },
  toggleFeatured: async (id) => {
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, featured: !i.featured, updatedAt: new Date().toISOString() } : i)),
    }));
    try {
      const updated = mapItem((await faqsAdminApi.toggleFeatured(id)) as Record<string, unknown>);
      set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
    } catch (err) {
      console.warn("[faqs] item feature sync", err);
      await get().hydrate();
    }
  },
  moveItem: async (id, dir) => {
    // optimistic local swap within the item's category; backend only echoes the moved item
    set((s) => {
      const item = s.items.find((i) => i.id === id);
      if (!item) return s;
      const siblings = s.items.filter((i) => i.categoryId === item.categoryId).sort((a, b) => a.order - b.order);
      const i = siblings.findIndex((x) => x.id === id);
      const j = i + dir;
      if (j < 0 || j >= siblings.length) return s;
      [siblings[i], siblings[j]] = [siblings[j], siblings[i]];
      const reordered = siblings.map((x, k) => ({ ...x, order: k }));
      return { items: s.items.map((x) => reordered.find((r) => r.id === x.id) ?? x) };
    });
    try {
      await faqsAdminApi.moveItem(id, dir);
    } catch (err) {
      console.warn("[faqs] item move sync", err);
      await get().hydrate();
    }
  },

  reset: () => void get().hydrate(),
}));
