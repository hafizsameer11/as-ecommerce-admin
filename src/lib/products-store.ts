import { create } from "zustand";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import {
  mapAdminProduct,
  productsAdminApi,
  type AdminProductStatus,
  type BulkProductBody,
  type MappedAdminProduct,
  type ProductInputBody,
  type ProductPatchBody,
} from "@/lib/api/products-admin";

export type AdminProduct = MappedAdminProduct;

export type UiStatus = "Active" | "Draft" | "Archived";

export function statusLabel(s: AdminProductStatus): UiStatus {
  if (s === "draft") return "Draft";
  if (s === "archived") return "Archived";
  return "Active";
}

export function statusKey(label: UiStatus): AdminProductStatus {
  if (label === "Draft") return "draft";
  if (label === "Archived") return "archived";
  return "active";
}

type State = {
  products: AdminProduct[];
  counts: { all: number; active: number; draft: number; archived: number };
  page: number;
  pageCount: number;
  hydrated: boolean;
  hydrate: (opts?: { page?: number; pageSize?: number; append?: boolean }) => Promise<void>;
  create: (body: ProductInputBody) => Promise<AdminProduct>;
  update: (id: string, patch: ProductPatchBody) => Promise<void>;
  setStatus: (id: string, status: AdminProductStatus) => Promise<void>;
  duplicate: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  bulk: (body: BulkProductBody) => Promise<void>;
};

export const useProducts = create<State>()((set, get) => ({
  products: [],
  counts: { all: 0, active: 0, draft: 0, archived: 0 },
  page: 1,
  pageCount: 1,
  hydrated: false,
  hydrate: async (opts) => {
    const page = opts?.page ?? 1;
    const pageSize = opts?.pageSize ?? 50;
    try {
      const { data, meta } = await productsAdminApi.list({ page, pageSize });
      const batch = ((data as unknown[]) ?? []).map((d) =>
        mapAdminProduct(d as Parameters<typeof mapAdminProduct>[0]),
      );
      const counts = (meta?.counts as State["counts"] | undefined) ??
        (meta?.tabs as State["counts"] | undefined) ?? {
          all: Number(meta?.total ?? batch.length),
          active: batch.filter((p) => p.status === "active").length,
          draft: batch.filter((p) => p.status === "draft").length,
          archived: batch.filter((p) => p.status === "archived").length,
        };
      set((s) => ({
        products: opts?.append && page > 1 ? [...s.products, ...batch] : batch,
        counts,
        page,
        pageCount: Math.max(1, Number(meta?.pageCount ?? 1)),
        hydrated: true,
      }));
    } catch (err) {
      console.warn("[products] hydrate failed", err);
      toast.error(err instanceof ApiError ? err.message : "Failed to load products");
      set({ hydrated: true });
    }
  },
  create: async (body) => {
    const dto = await productsAdminApi.create(body);
    const mapped = mapAdminProduct(dto);
    set((s) => ({ products: [mapped, ...s.products] }));
    await get().hydrate();
    return mapped;
  },
  update: async (id, patch) => {
    const dto = await productsAdminApi.update(id, patch);
    const mapped = mapAdminProduct(dto);
    set((s) => ({
      products: s.products.map((p) => (p.id === id || p.productId === id ? mapped : p)),
    }));
  },
  setStatus: async (id, status) => {
    set((s) => ({
      products: s.products.map((p) =>
        p.id === id || p.productId === id ? { ...p, status } : p,
      ),
    }));
    try {
      const dto = await productsAdminApi.setStatus(id, status);
      const mapped = mapAdminProduct(dto);
      set((s) => ({
        products: s.products.map((p) => (p.id === id || p.productId === id ? mapped : p)),
      }));
    } catch (err) {
      console.warn("[products] setStatus sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not update product status");
      await get().hydrate();
      throw err;
    }
  },
  duplicate: async (id) => {
    const dto = await productsAdminApi.duplicate(id);
    const mapped = mapAdminProduct(dto);
    set((s) => ({ products: [mapped, ...s.products] }));
    await get().hydrate();
  },
  remove: async (id) => {
    set((s) => ({
      products: s.products.filter((p) => p.id !== id && p.productId !== id),
    }));
    try {
      await productsAdminApi.remove(id);
      await get().hydrate();
    } catch (err) {
      console.warn("[products] remove sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not remove product");
      await get().hydrate();
      throw err;
    }
  },
  bulk: async (body) => {
    await productsAdminApi.bulk(body);
    await get().hydrate();
  },
}));
