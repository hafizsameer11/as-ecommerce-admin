import { create } from "zustand";
import { blogAdminApi } from "@/lib/api/cms";

export type PostStatus = "published" | "draft" | "scheduled" | "archived";

export type BlogAuthor = {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
};

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  colour: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;                 // markdown-ish body
  coverUrl?: string;
  categoryId: string;
  authorId: string;
  tags: string[];
  status: PostStatus;
  featured: boolean;
  readingMinutes: number;
  seoTitle: string;
  seoDescription: string;
  ogImage?: string;
  publishedAt?: string;
  scheduledFor?: string;
  updatedAt: string;
  views30d: number;
  likes: number;
  comments: number;
};

function iso(v: unknown): string | undefined {
  if (!v) return undefined;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

function mapAuthor(a: Record<string, unknown>): BlogAuthor {
  return {
    id: String(a.id),
    name: String(a.name ?? ""),
    role: String(a.role ?? ""),
    avatarUrl: a.avatarUrl ? String(a.avatarUrl) : undefined,
  };
}

function mapCategory(c: Record<string, unknown>): BlogCategory {
  return {
    id: String(c.id),
    name: String(c.name ?? ""),
    slug: String(c.slug ?? ""),
    colour: String(c.colour ?? "#0f0f0f"),
  };
}

function mapPost(p: Record<string, unknown>): BlogPost {
  return {
    id: String(p.id),
    title: String(p.title ?? ""),
    slug: String(p.slug ?? ""),
    excerpt: String(p.excerpt ?? ""),
    content: String(p.content ?? ""),
    coverUrl: p.coverUrl ? String(p.coverUrl) : undefined,
    categoryId: String(p.categoryId ?? ""),
    authorId: String(p.authorId ?? ""),
    tags: Array.isArray(p.tags) ? (p.tags as string[]) : [],
    status: (p.status as PostStatus) || "draft",
    featured: !!p.featured,
    readingMinutes: Number(p.readingMinutes ?? 1),
    seoTitle: p.seoTitle ? String(p.seoTitle) : "",
    seoDescription: p.seoDescription ? String(p.seoDescription) : "",
    ogImage: p.ogImage ? String(p.ogImage) : undefined,
    publishedAt: iso(p.publishedAt),
    scheduledFor: iso(p.scheduledFor),
    updatedAt: iso(p.updatedAt) ?? new Date().toISOString(),
    views30d: Number(p.views30d ?? 0),
    likes: Number(p.likes ?? 0),
    comments: Number(p.comments ?? 0),
  };
}

/** true delta — only keys present on `patch` are sent; empty optional urls clear the field */
function toBody(patch: Partial<BlogPost>) {
  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) {
    if (k === "coverUrl" || k === "ogImage") body[k] = v || null;
    else if (k === "seoTitle" || k === "seoDescription") body[k] = v ?? null;
    else body[k] = v;
  }
  return body;
}

type State = {
  authors: BlogAuthor[];
  categories: BlogCategory[];
  posts: BlogPost[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  create: () => Promise<string>;
  update: (id: string, patch: Partial<BlogPost>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  setStatus: (id: string, status: PostStatus) => Promise<void>;
  toggleFeatured: (id: string) => Promise<void>;
  /** `BlogCategory` CRUD beyond create is not exposed in the admin UI yet; only add is wired. */
  addCategory: (name: string) => Promise<void>;
  reset: () => void;
};

export const useBlog = create<State>()((set, get) => ({
  authors: [],
  categories: [],
  posts: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [authors, categories, postsRes] = await Promise.all([
        blogAdminApi.authors(),
        blogAdminApi.categories(),
        blogAdminApi.list({ pageSize: 100 }),
      ]);
      set({
        authors: (authors as Record<string, unknown>[]).map(mapAuthor),
        categories: (categories as Record<string, unknown>[]).map(mapCategory),
        posts: (postsRes.data as Record<string, unknown>[]).map(mapPost),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[blog] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async () => {
    const { categories, authors } = get();
    const created = mapPost(
      (await blogAdminApi.create({
        title: "Untitled post",
        categoryId: categories[0]?.id,
        authorId: authors[0]?.id,
      })) as Record<string, unknown>,
    );
    set((s) => ({ posts: [created, ...s.posts] }));
    return created.id;
  },
  update: async (id, patch) => {
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p)),
    }));
    // the general PATCH /blog/:id endpoint doesn't accept status/scheduledFor —
    // those are only settable via the dedicated /status endpoint.
    if ("scheduledFor" in patch) {
      try {
        const updated = mapPost(
          (await blogAdminApi.setStatus(id, patch.scheduledFor ? "scheduled" : "draft", patch.scheduledFor)) as Record<
            string,
            unknown
          >,
        );
        set((s) => ({ posts: s.posts.map((p) => (p.id === id ? updated : p)) }));
      } catch (err) {
        console.warn("[blog] post scheduledFor sync", err);
        await get().hydrate();
      }
      return;
    }
    try {
      const updated = mapPost((await blogAdminApi.update(id, toBody(patch))) as Record<string, unknown>);
      set((s) => ({ posts: s.posts.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[blog] post update sync", err);
      await get().hydrate();
    }
  },
  remove: async (id) => {
    await blogAdminApi.remove(id);
    set((s) => ({ posts: s.posts.filter((p) => p.id !== id) }));
  },
  duplicate: async (id) => {
    const copy = mapPost((await blogAdminApi.duplicate(id)) as Record<string, unknown>);
    set((s) => ({ posts: [copy, ...s.posts] }));
  },
  setStatus: async (id, status) => {
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p)),
    }));
    try {
      const updated = mapPost((await blogAdminApi.setStatus(id, status)) as Record<string, unknown>);
      set((s) => ({ posts: s.posts.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[blog] post status sync", err);
      await get().hydrate();
    }
  },
  toggleFeatured: async (id) => {
    set((s) => ({
      posts: s.posts.map((p) => (p.id === id ? { ...p, featured: !p.featured, updatedAt: new Date().toISOString() } : p)),
    }));
    try {
      const updated = mapPost((await blogAdminApi.toggleFeatured(id)) as Record<string, unknown>);
      set((s) => ({ posts: s.posts.map((p) => (p.id === id ? updated : p)) }));
    } catch (err) {
      console.warn("[blog] post feature sync", err);
      await get().hydrate();
    }
  },
  addCategory: async (name) => {
    const created = mapCategory((await blogAdminApi.createCategory({ name })) as Record<string, unknown>);
    set((s) => ({ categories: [...s.categories, created] }));
  },
  reset: () => void get().hydrate(),
}));
