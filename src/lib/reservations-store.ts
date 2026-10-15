import { create } from "zustand";
import { dropsAdminApi } from "@/lib/api/fulfilment";
import { koboToNaira } from "@/lib/api/client";

export type Reservation = {
  id: string;
  apiId: string;
  dropId: string;
  productId: string;
  productName: string;
  brand: string;
  image: string;
  size?: string;
  price: number;
  deposit: number;
  balance: number;
  releaseAt: string;
  createdAt: number;
  status: "Reserved" | "Cancelled";
};

function mapStatus(raw: string): Reservation["status"] {
  const s = raw.toLowerCase();
  if (s.includes("cancel") || s.includes("expir")) return "Cancelled";
  return "Reserved";
}

function mapReservation(r: Record<string, unknown>): Reservation {
  const drop = (r.drop as Record<string, unknown> | undefined) ?? {};
  const product = (r.product as Record<string, unknown> | undefined) ?? {};
  const releaseAt = drop.releaseAt
    ? typeof drop.releaseAt === "string"
      ? drop.releaseAt
      : new Date(drop.releaseAt as string).toISOString()
    : new Date().toISOString();
  return {
    id: String(r.number || r.id),
    apiId: String(r.id),
    dropId: String(drop.id ?? r.dropId ?? ""),
    productId: String(product.id ?? product.productId ?? ""),
    productName: String(product.name ?? ""),
    brand: String(product.brand ?? ""),
    image: String(product.image || "/favicon.png"),
    size: r.size ? String(r.size) : undefined,
    price: koboToNaira(Number(r.price ?? 0)),
    deposit: koboToNaira(Number(r.deposit ?? 0)),
    balance: koboToNaira(Number(r.balance ?? 0)),
    releaseAt,
    createdAt: r.createdAt ? new Date(r.createdAt as string).getTime() : Date.now(),
    status: mapStatus(String(r.status ?? "reserved")),
  };
}

type ReservationsState = {
  items: Reservation[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  reserve: (r: Omit<Reservation, "id" | "apiId" | "createdAt" | "status">) => Reservation;
  cancel: (id: string) => Promise<void>;
  hasDrop: (dropId: string) => boolean;
};

export const useReservations = create<ReservationsState>()((set, get) => ({
  items: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const { data: drops } = await dropsAdminApi.list({ pageSize: 100, tab: "all" });
      const dropRows = (drops as Record<string, unknown>[]) ?? [];
      const batches = await Promise.all(
        dropRows.map(async (d) => {
          const dropId = String(d.id);
          try {
            const { data } = await dropsAdminApi.listReservations(dropId, {
              pageSize: 100,
              tab: "all",
            });
            return ((data as Record<string, unknown>[]) ?? []).map((row) => {
              const mapped = mapReservation(row);
              return mapped.dropId ? mapped : { ...mapped, dropId };
            });
          } catch (err) {
            console.warn(`[reservations] drop ${dropId} reservations`, err);
            return [] as Reservation[];
          }
        }),
      );
      set({ items: batches.flat(), hydrated: true });
    } catch (err) {
      console.warn("[reservations] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  reserve: (r) => {
    const res: Reservation = {
      ...r,
      id: `RSV-${Date.now().toString().slice(-6)}`,
      apiId: `local-${Date.now()}`,
      createdAt: Date.now(),
      status: "Reserved",
    };
    set((s) => ({ items: [res, ...s.items] }));
    return res;
  },
  cancel: async (id) => {
    const row = get().items.find((i) => i.id === id || i.apiId === id);
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id || i.apiId === id ? { ...i, status: "Cancelled" as const } : i,
      ),
    }));
    if (!row?.dropId || row.apiId.startsWith("local-")) return;
    try {
      await dropsAdminApi.cancelReservation(row.dropId, row.apiId, {
        reason: "Cancelled by admin",
        refundTo: "original",
      });
    } catch (err) {
      console.warn("[reservations] cancel sync", err);
      await get().hydrate();
    }
  },
  hasDrop: (dropId) =>
    get().items.some((i) => i.dropId === dropId && i.status === "Reserved"),
}));

export const useActiveReservations = () =>
  useReservations((s) => s.items.filter((i) => i.status === "Reserved"));
