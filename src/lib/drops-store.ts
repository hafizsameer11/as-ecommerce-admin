import { create } from "zustand";
import { dropsAdminApi } from "@/lib/api/fulfilment";
import { koboToNaira } from "@/lib/api/client";

export type DropStatus = "upcoming" | "live" | "sold_out" | "ended";

export type AdminDrop = {
  id: string;
  productId: string;
  productHandle: string;
  productName: string;
  brand: string;
  image: string;
  price: number;
  releaseAt: string;
  status: DropStatus;
  statusLabel: string;
  allocation: number;
  reservedCount: number;
  remaining: number;
  depositPct: number;
  teaser: string;
  fillPct: number;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateDropInput = {
  productId: string;
  releaseAt: string;
  allocation: number;
  depositPct?: number;
  teaser?: string | null;
};

export type UpdateDropInput = {
  releaseAt?: string;
  allocation?: number;
  depositPct?: number;
  teaser?: string | null;
};

function mapDrop(d: Record<string, unknown>): AdminDrop {
  const product = (d.product as Record<string, unknown> | undefined) ?? {};
  const stats = (d.stats as Record<string, unknown> | undefined) ?? {};
  return {
    id: String(d.id),
    productId: String(product.id ?? product.productId ?? ""),
    productHandle: String(product.handle ?? product.id ?? ""),
    productName: String(product.name ?? ""),
    brand: String(product.brand ?? ""),
    image: String(product.image || "/favicon.png"),
    price: koboToNaira(Number(product.price ?? 0)),
    releaseAt:
      typeof d.releaseAt === "string"
        ? d.releaseAt
        : d.releaseAt
          ? new Date(d.releaseAt as string).toISOString()
          : new Date().toISOString(),
    status: (String(d.status || "upcoming") as DropStatus),
    statusLabel: String(d.statusLabel ?? d.status ?? "Upcoming"),
    allocation: Number(d.allocation ?? 0),
    reservedCount: Number(d.reservedCount ?? 0),
    remaining: Number(d.remaining ?? Math.max(0, Number(d.allocation ?? 0) - Number(d.reservedCount ?? 0))),
    depositPct: Number(d.depositPct ?? 20),
    teaser: String(d.teaser ?? ""),
    fillPct: Number(stats.fillPct ?? 0),
    createdAt: d.createdAt ? String(d.createdAt) : undefined,
    updatedAt: d.updatedAt ? String(d.updatedAt) : undefined,
  };
}

type State = {
  drops: AdminDrop[];
  tabs: Record<string, number>;
  hydrated: boolean;
  hydrate: (query?: { tab?: string; q?: string }) => Promise<void>;
  create: (body: CreateDropInput) => Promise<AdminDrop>;
  update: (id: string, body: UpdateDropInput) => Promise<void>;
  goLive: (id: string) => Promise<void>;
  end: (id: string) => Promise<void>;
};

export const useDrops = create<State>()((set, get) => ({
  drops: [],
  tabs: {},
  hydrated: false,
  hydrate: async (query = {}) => {
    try {
      const { data, meta } = await dropsAdminApi.list({
        pageSize: 100,
        tab: query.tab ?? "all",
        q: query.q,
      });
      set({
        drops: ((data as Record<string, unknown>[]) ?? []).map(mapDrop),
        tabs: (meta?.tabs as Record<string, number> | undefined) ?? {},
        hydrated: true,
      });
    } catch (err) {
      console.warn("[drops] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  create: async (body) => {
    const dto = (await dropsAdminApi.create({
      productId: body.productId,
      releaseAt: body.releaseAt,
      allocation: body.allocation,
      depositPct: body.depositPct,
      teaser: body.teaser ?? null,
    })) as Record<string, unknown>;
    const mapped = mapDrop(dto);
    set((s) => ({ drops: [mapped, ...s.drops] }));
    await get().hydrate();
    return mapped;
  },
  update: async (id, body) => {
    const dto = (await dropsAdminApi.update(id, {
      releaseAt: body.releaseAt,
      allocation: body.allocation,
      depositPct: body.depositPct,
      teaser: body.teaser,
    })) as Record<string, unknown>;
    const mapped = mapDrop(dto);
    set((s) => ({ drops: s.drops.map((d) => (d.id === id ? mapped : d)) }));
  },
  goLive: async (id) => {
    await dropsAdminApi.goLive(id);
    await get().hydrate();
  },
  end: async (id) => {
    await dropsAdminApi.end(id);
    await get().hydrate();
  },
}));
