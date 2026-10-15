import { create } from "zustand";
import { pagesAdminApi } from "@/lib/api/cms";

export type PageStatus = "published" | "draft" | "scheduled" | "archived";
export type PageTemplate = "standard" | "legal" | "landing" | "story" | "help";
export type PageVisibility = "public" | "unlisted" | "members";

export type BlockType = "hero" | "rich_text" | "image" | "gallery" | "cta" | "faq" | "video" | "columns" | "quote";

export type PageBlock = {
  id: string;
  type: BlockType;
  title?: string;
  body?: string;
  imageUrl?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export type PageRecord = {
  id: string;
  title: string;
  slug: string;
  template: PageTemplate;
  status: PageStatus;
  visibility: PageVisibility;
  author: string;
  updatedAt: string;
  publishedAt?: string;
  scheduledFor?: string;
  seoTitle: string;
  seoDescription: string;
  ogImage?: string;
  showInFooter: boolean;
  showInHeader: boolean;
  views30d: number;
  blocks: PageBlock[];
  tags: string[];
};

function mapBlock(b: Record<string, unknown>): PageBlock {
  return {
    id: String(b.id ?? Math.random().toString(36).slice(2, 9)),
    type: (b.type as BlockType) || "rich_text",
    title: b.title ? String(b.title) : undefined,
    body: b.body ? String(b.body) : undefined,
    imageUrl: b.imageUrl ? String(b.imageUrl) : undefined,
    ctaLabel: b.ctaLabel ? String(b.ctaLabel) : undefined,
    ctaHref: b.ctaHref ? String(b.ctaHref) : undefined,
  };
}

function mapPage(p: Record<string, unknown>): PageRecord {
  const status = (["published", "draft", "scheduled", "archived"].includes(String(p.status))
    ? String(p.status)
    : "draft") as PageStatus;
  const slugRaw = String(p.path ?? p.slug ?? "");
  const slug = slugRaw.startsWith("/") ? slugRaw : `/${slugRaw.replace(/^\//, "")}`;
  return {
    id: String(p.id),
    title: String(p.title ?? ""),
    slug,
    template: (p.template as PageTemplate) || "standard",
    status,
    visibility: (p.visibility as PageVisibility) || "public",
    author: String(p.author ?? ""),
    updatedAt: p.updatedAt ? new Date(p.updatedAt as string).toISOString() : new Date().toISOString(),
    publishedAt: p.publishedAt ? new Date(p.publishedAt as string).toISOString() : undefined,
    scheduledFor: p.scheduledFor ? new Date(p.scheduledFor as string).toISOString() : undefined,
    seoTitle: String(p.seoTitle ?? ""),
    seoDescription: String(p.seoDescription ?? ""),
    ogImage: p.ogImage ? String(p.ogImage) : undefined,
    showInFooter: !!p.showInFooter,
    showInHeader: !!p.showInHeader,
    views30d: Number(p.views30d ?? 0),
    blocks: Array.isArray(p.blocks) ? (p.blocks as Record<string, unknown>[]).map(mapBlock) : [],
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
  };
}

function toPageBody(p: Partial<PageRecord>) {
  const body: Record<string, unknown> = {};
  if (p.title !== undefined) body.title = p.title;
  if (p.slug !== undefined) body.slug = p.slug.replace(/^\//, "");
  if (p.template !== undefined) body.template = p.template;
  if (p.visibility !== undefined) body.visibility = p.visibility;
  if (p.author !== undefined) body.author = p.author;
  if (p.seoTitle !== undefined) body.seoTitle = p.seoTitle;
  if (p.seoDescription !== undefined) body.seoDescription = p.seoDescription;
  if (p.ogImage !== undefined) body.ogImage = p.ogImage ?? null;
  if (p.showInFooter !== undefined) body.showInFooter = p.showInFooter;
  if (p.showInHeader !== undefined) body.showInHeader = p.showInHeader;
  if (p.tags !== undefined) body.tags = p.tags;
  if (p.blocks !== undefined) body.blocks = p.blocks;
  return body;
}

type State = {
  pages: PageRecord[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: (p: Partial<PageRecord> & { title: string; slug: string }) => Promise<string>;
  update: (id: string, patch: Partial<PageRecord>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  setStatus: (id: string, status: PageStatus) => Promise<void>;
  addBlock: (id: string, type: BlockType) => Promise<void>;
  removeBlock: (id: string, blockId: string) => Promise<void>;
  updateBlock: (id: string, blockId: string, patch: Partial<PageBlock>) => Promise<void>;
  moveBlock: (id: string, blockId: string, dir: -1 | 1) => Promise<void>;
  reset: () => void;
};

export const usePages = create<State>()((set, get) => ({
  pages: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await pagesAdminApi.list({ pageSize: 100 });
      set({ pages: (data as Record<string, unknown>[]).map(mapPage), hydrated: true });
    } catch (err) {
      console.warn("[pages] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (p) => {
    try {
      const created = mapPage(
        (await pagesAdminApi.create({
          title: p.title,
          slug: p.slug.replace(/^\//, ""),
          template: p.template ?? "standard",
          status: "draft",
          visibility: p.visibility ?? "public",
          showInFooter: p.showInFooter ?? false,
          showInHeader: p.showInHeader ?? false,
          tags: p.tags ?? [],
        })) as Record<string, unknown>,
      );
      set((st) => ({ pages: [created, ...st.pages] }));
      return created.id;
    } catch (err) {
      console.warn("[pages] create", err);
      await get().hydrate();
      return "";
    }
  },
  update: async (id, patch) => {
    set((st) => ({
      pages: st.pages.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }));
    // the general PATCH /pages/:id endpoint doesn't accept status/scheduledFor —
    // those are only settable via the dedicated /status endpoint.
    if ("scheduledFor" in patch) {
      try {
        const updated = mapPage(
          (await pagesAdminApi.setStatus(id, patch.scheduledFor ? "scheduled" : "draft", patch.scheduledFor)) as Record<
            string,
            unknown
          >,
        );
        set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
      } catch (err) {
        console.warn("[pages] update scheduledFor", err);
        await get().hydrate();
      }
      return;
    }
    try {
      const updated = mapPage((await pagesAdminApi.update(id, toPageBody(patch))) as Record<string, unknown>);
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[pages] update", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    set((st) => ({ pages: st.pages.filter((p) => p.id !== id) }));
    try {
      await pagesAdminApi.remove(id);
    } catch (err) {
      console.warn("[pages] remove", err);
      await get().hydrate();
    }
  },
  duplicate: async (id) => {
    try {
      const copy = mapPage((await pagesAdminApi.duplicate(id)) as Record<string, unknown>);
      set((st) => ({ pages: [copy, ...st.pages] }));
    } catch (err) {
      console.warn("[pages] duplicate", err);
      await get().hydrate();
    }
  },
  setStatus: async (id, status) => {
    const cur = get().pages.find((p) => p.id === id);
    set((st) => ({
      pages: st.pages.map((p) =>
        p.id === id
          ? {
              ...p,
              status,
              publishedAt: status === "published" ? new Date().toISOString() : p.publishedAt,
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
    try {
      const updated = mapPage(
        (await pagesAdminApi.setStatus(id, status, cur?.scheduledFor)) as Record<string, unknown>,
      );
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[pages] setStatus", err);
      await get().hydrate();
    }
  },
  addBlock: async (id, type) => {
    try {
      const updated = mapPage((await pagesAdminApi.addBlock(id, { type })) as Record<string, unknown>);
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[pages] addBlock", err);
      await get().hydrate();
    }
  },
  removeBlock: async (id, blockId) => {
    set((st) => ({
      pages: st.pages.map((p) =>
        p.id === id
          ? { ...p, blocks: p.blocks.filter((b) => b.id !== blockId), updatedAt: new Date().toISOString() }
          : p,
      ),
    }));
    try {
      const updated = mapPage((await pagesAdminApi.removeBlock(id, blockId)) as Record<string, unknown>);
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[pages] removeBlock", err);
      await get().hydrate();
    }
  },
  updateBlock: async (id, blockId, patch) => {
    set((st) => ({
      pages: st.pages.map((p) =>
        p.id === id
          ? {
              ...p,
              blocks: p.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
    try {
      const updated = mapPage(
        (await pagesAdminApi.updateBlock(id, blockId, patch as Record<string, unknown>)) as Record<string, unknown>,
      );
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[pages] updateBlock", err);
      await get().hydrate();
    }
  },
  moveBlock: async (id, blockId, dir) => {
    try {
      const updated = mapPage((await pagesAdminApi.moveBlock(id, blockId, dir)) as Record<string, unknown>);
      set((st) => ({ pages: st.pages.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[pages] moveBlock", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));
