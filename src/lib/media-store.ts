import { create } from "zustand";
import { mediaAdminApi } from "@/lib/api/cms";

export type MediaFolder = "products" | "hero" | "campaigns" | "concierge" | "brand" | "uncategorized";

export const FOLDERS: { id: MediaFolder; label: string }[] = [
  { id: "products", label: "Products" },
  { id: "hero", label: "Hero & Banners" },
  { id: "campaigns", label: "Campaigns" },
  { id: "concierge", label: "Concierge" },
  { id: "brand", label: "Brand Assets" },
  { id: "uncategorized", label: "Uncategorized" },
];

export type MediaType = "image" | "video" | "document";

export type MediaAsset = {
  id: string;
  name: string;
  url: string;
  type: MediaType;
  folder: MediaFolder;
  sizeKB: number;
  width: number;
  height: number;
  altText: string;
  tags: string[];
  usedIn: string[];
  uploadedAt: number;
  uploadedBy: string;
  starred: boolean;
};

function mapAsset(a: Record<string, unknown>): MediaAsset {
  const folder = String(a.folder ?? "uncategorized");
  const usedRaw = a.usedIn;
  const usedIn = Array.isArray(usedRaw)
    ? usedRaw.map((u) => {
        if (typeof u === "string") return u;
        const row = u as { entityType?: string; entityId?: string };
        return row.entityId ? `${row.entityType ?? "ref"}:${row.entityId}` : String(u);
      })
    : [];
  const uploadedAt = a.uploadedAt
    ? new Date(a.uploadedAt as string).getTime()
    : a.createdAt
      ? new Date(a.createdAt as string).getTime()
      : Date.now();
  return {
    id: String(a.id),
    name: String(a.name ?? ""),
    url: String(a.url ?? ""),
    type: (a.type as MediaType) || "image",
    folder: (FOLDERS.some((f) => f.id === folder) ? folder : "uncategorized") as MediaFolder,
    sizeKB: Number(a.sizeKB ?? Math.round(Number(a.sizeBytes ?? 0) / 1024)),
    width: Number(a.width ?? 0),
    height: Number(a.height ?? 0),
    altText: String(a.altText ?? ""),
    tags: Array.isArray(a.tags) ? a.tags.map(String) : [],
    usedIn,
    uploadedAt,
    uploadedBy: String(a.uploadedBy ?? "Admin"),
    starred: !!a.starred,
  };
}

type MediaState = {
  assets: MediaAsset[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /** Upload files via multipart; optional metadata applied to the batch. */
  upload: (
    files: File[],
    meta?: { folder?: MediaFolder; altText?: string; tags?: string[] },
  ) => Promise<MediaAsset[]>;
  /** @deprecated prefer upload(File[]) — kept for callers that still pass a local draft */
  addAsset: (a: Omit<MediaAsset, "id" | "uploadedAt"> & { file?: File }) => Promise<void>;
  removeAsset: (id: string) => Promise<void>;
  removeMany: (ids: string[]) => Promise<void>;
  updateAsset: (id: string, patch: Partial<MediaAsset>) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  moveMany: (ids: string[], folder: MediaFolder) => Promise<void>;
  reset: () => void;
};

export const useMedia = create<MediaState>()((set, get) => ({
  assets: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await mediaAdminApi.list({ pageSize: 100 });
      set({ assets: (data as Record<string, unknown>[]).map(mapAsset), hydrated: true });
    } catch (err) {
      console.warn("[media] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  upload: async (files, meta = {}) => {
    if (!files.length) return [];
    const form = new FormData();
    for (const f of files) form.append("files", f);
    form.append("folder", meta.folder ?? "uncategorized");
    if (meta.altText) form.append("altText", meta.altText);
    if (meta.tags?.length) form.append("tags", meta.tags.join(","));
    const res = await mediaAdminApi.upload(form);
    const rows = (Array.isArray(res) ? res : [res]) as Record<string, unknown>[];
    const mapped = rows.map(mapAsset);
    set((s) => ({ assets: [...mapped, ...s.assets] }));
    return mapped;
  },
  addAsset: async (a) => {
    if (a.file) {
      await get().upload([a.file], { folder: a.folder, altText: a.altText, tags: a.tags });
      return;
    }
    // No file — optimistic local-only fallback (should not be used in production UI)
    set((s) => ({
      assets: [
        {
          ...a,
          id: `M-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          uploadedAt: Date.now(),
        },
        ...s.assets,
      ],
    }));
  },
  removeAsset: async (id) => {
    await mediaAdminApi.remove(id);
    set((s) => ({ assets: s.assets.filter((a) => a.id !== id) }));
  },
  removeMany: async (ids) => {
    if (!ids.length) return;
    await mediaAdminApi.bulkDelete(ids);
    set((s) => ({ assets: s.assets.filter((a) => !ids.includes(a.id)) }));
  },
  updateAsset: async (id, patch) => {
    set((s) => ({ assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
    try {
      const res = (await mediaAdminApi.update(id, {
        name: patch.name,
        altText: patch.altText,
        tags: patch.tags,
        folder: patch.folder,
      })) as Record<string, unknown>;
      const row = (res.after ?? res) as Record<string, unknown>;
      const updated = mapAsset(row);
      set((s) => ({ assets: s.assets.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[media] update sync", err);
      await get().hydrate();
    }
  },
  toggleStar: async (id) => {
    set((s) => ({
      assets: s.assets.map((a) => (a.id === id ? { ...a, starred: !a.starred } : a)),
    }));
    try {
      const updated = mapAsset((await mediaAdminApi.star(id)) as Record<string, unknown>);
      set((s) => ({ assets: s.assets.map((a) => (a.id === id ? updated : a)) }));
    } catch (err) {
      console.warn("[media] star sync", err);
      await get().hydrate();
    }
  },
  moveMany: async (ids, folder) => {
    set((s) => ({
      assets: s.assets.map((a) => (ids.includes(a.id) ? { ...a, folder } : a)),
    }));
    try {
      await mediaAdminApi.move(ids, folder);
      await get().hydrate();
    } catch (err) {
      console.warn("[media] move sync", err);
      await get().hydrate();
    }
  },
  reset: () => void get().hydrate(),
}));

export function humanSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function relTime(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
