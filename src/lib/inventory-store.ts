import { create } from "zustand";
import { inventoryAdminApi, warehousesAdminApi } from "@/lib/api/fulfilment";
import { productsAdminApi } from "@/lib/api/products-admin";
import { koboToNaira } from "@/lib/api/client";
import { getAllProducts, type Product } from "./shop-data";

export type Warehouse = { id: string; name: string; code: string; city: string };

/** Mutated on hydrate so existing `WAREHOUSES` imports stay valid and re-read on store updates. */
export const WAREHOUSES: Warehouse[] = [];

function replaceWarehouses(list: Warehouse[]) {
  WAREHOUSES.length = 0;
  WAREHOUSES.push(...list);
}

export type StockRow = {
  sku: string;
  productId: string;
  variant: string;
  warehouseId: string;
  onHand: number;
  reserved: number;
  reorderPoint: number;
  cost: number;
  /** Optional display fields from API when shop-data has no match */
  productName?: string;
  brand?: string;
  image?: string | null;
};

export type Movement = {
  id: string;
  sku: string;
  warehouseId: string;
  type: "receive" | "adjust" | "transfer" | "sale" | "return";
  qty: number;
  note: string;
  ts: number;
  user: string;
};

export type ProductSizing = { sizeLabels: Record<string, string>; modelFit: string };

function mapWarehouse(w: Record<string, unknown>): Warehouse {
  return {
    id: String(w.id),
    name: String(w.name ?? ""),
    code: String(w.code ?? ""),
    city: String(w.city ?? ""),
  };
}

function mapStockRow(r: Record<string, unknown>): StockRow {
  const costRaw = Number(r.cost ?? 0);
  return {
    sku: String(r.sku ?? ""),
    productId: String(r.productId ?? ""),
    variant: String(r.variant ?? "One Size"),
    warehouseId: String(r.warehouseId ?? ""),
    onHand: Number(r.onHand ?? 0),
    reserved: Number(r.reserved ?? 0),
    reorderPoint: Number(r.reorderPoint ?? 0),
    cost: koboToNaira(costRaw),
    productName: r.productName ? String(r.productName) : undefined,
    brand: r.brand ? String(r.brand) : undefined,
    image: r.image != null ? String(r.image) : null,
  };
}

function mapMovementType(raw: string): Movement["type"] {
  if (raw === "receive") return "receive";
  if (raw === "sale") return "sale";
  if (raw === "return") return "return";
  if (raw === "transfer_out" || raw === "transfer_in" || raw === "transfer") return "transfer";
  return "adjust";
}

function mapMovement(m: Record<string, unknown>): Movement {
  return {
    id: String(m.id),
    sku: String(m.sku ?? ""),
    warehouseId: String(m.warehouseId ?? ""),
    type: mapMovementType(String(m.type ?? "adjust")),
    qty: Number(m.qty ?? 0),
    note: String(m.note ?? ""),
    ts: m.createdAt ? new Date(m.createdAt as string).getTime() : Date.now(),
    user: String(m.actor ?? "Admin"),
  };
}

type InventoryState = {
  rows: StockRow[];
  movements: Movement[];
  sizingByProduct: Record<string, ProductSizing>;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  adjust: (sku: string, warehouseId: string, delta: number, note: string) => Promise<void>;
  setReorder: (sku: string, warehouseId: string, rp: number) => Promise<void>;
  transfer: (sku: string, fromW: string, toW: string, qty: number, note: string) => Promise<void>;
  updateProductSizing: (productId: string, sizing: ProductSizing) => Promise<void>;
  reset: () => void;
};

export const useInventory = create<InventoryState>()((set, get) => ({
  rows: [],
  movements: [],
  sizingByProduct: {},
  hydrated: false,
  hydrate: async () => {
    try {
      const [stockRes, warehouses, movRes] = await Promise.all([
        inventoryAdminApi.list({ pageSize: 500 }),
        warehousesAdminApi.list().catch((err) => {
          console.warn("[inventory] warehouses hydrate", err);
          return [] as Record<string, unknown>[];
        }),
        inventoryAdminApi.movements({ pageSize: 200 }).catch((err) => {
          console.warn("[inventory] movements hydrate", err);
          return { data: [] as Record<string, unknown>[] };
        }),
      ]);
      replaceWarehouses(
        (Array.isArray(warehouses) ? warehouses : []).map((w) => mapWarehouse(w as Record<string, unknown>)),
      );
      set({
        rows: ((stockRes.data as Record<string, unknown>[]) ?? []).map(mapStockRow),
        movements: ((movRes.data as Record<string, unknown>[]) ?? []).map(mapMovement),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[inventory] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  adjust: async (sku, warehouseId, delta, note) => {
    set((s) => {
      const rows = s.rows.map((r) =>
        r.sku === sku && r.warehouseId === warehouseId
          ? { ...r, onHand: Math.max(0, r.onHand + delta) }
          : r,
      );
      const m: Movement = {
        id: `MV-${Date.now()}`,
        sku,
        warehouseId,
        type: "adjust",
        qty: delta,
        note,
        ts: Date.now(),
        user: "Admin",
      };
      return { rows, movements: [m, ...s.movements].slice(0, 200) };
    });
    try {
      await inventoryAdminApi.adjust({
        sku,
        warehouseId,
        delta,
        note,
        type: delta > 0 ? "receive" : "adjust",
      });
      await get().hydrate();
    } catch (err) {
      console.warn("[inventory] adjust sync", err);
      await get().hydrate();
    }
  },
  setReorder: async (sku, warehouseId, rp) => {
    set((s) => ({
      rows: s.rows.map((r) =>
        r.sku === sku && r.warehouseId === warehouseId ? { ...r, reorderPoint: rp } : r,
      ),
    }));
    try {
      await inventoryAdminApi.setReorderPoint({ sku, warehouseId, reorderPoint: rp });
    } catch (err) {
      console.warn("[inventory] reorder sync", err);
      await get().hydrate();
    }
  },
  transfer: async (sku, fromW, toW, qty, note) => {
    if (qty <= 0) return;
    set((s) => {
      let rows = s.rows.map((r) => {
        if (r.sku === sku && r.warehouseId === fromW) {
          return { ...r, onHand: Math.max(0, r.onHand - qty) };
        }
        return r;
      });
      const exists = rows.find((r) => r.sku === sku && r.warehouseId === toW);
      if (exists) {
        rows = rows.map((r) =>
          r.sku === sku && r.warehouseId === toW ? { ...r, onHand: r.onHand + qty } : r,
        );
      } else {
        const src = s.rows.find((r) => r.sku === sku && r.warehouseId === fromW);
        if (src) {
          rows.push({ ...src, warehouseId: toW, onHand: qty, reserved: 0 });
        }
      }
      const ts = Date.now();
      const outMv: Movement = {
        id: `MV-${ts}-o`,
        sku,
        warehouseId: fromW,
        type: "transfer",
        qty: -qty,
        note: `→ ${toW}: ${note}`,
        ts,
        user: "Admin",
      };
      const inMv: Movement = {
        id: `MV-${ts}-i`,
        sku,
        warehouseId: toW,
        type: "transfer",
        qty,
        note: `← ${fromW}: ${note}`,
        ts,
        user: "Admin",
      };
      return { rows, movements: [outMv, inMv, ...s.movements].slice(0, 200) };
    });
    try {
      await inventoryAdminApi.transfer({ sku, from: fromW, to: toW, qty, note });
      await get().hydrate();
    } catch (err) {
      console.warn("[inventory] transfer sync", err);
      await get().hydrate();
    }
  },
  updateProductSizing: async (productId, sizing) => {
    set((state) => ({ sizingByProduct: { ...state.sizingByProduct, [productId]: sizing } }));
    try {
      await productsAdminApi.update(productId, {
        sizeLabels: sizing.sizeLabels,
        modelFit: sizing.modelFit || null,
      });
    } catch (err) {
      console.warn("[inventory] sizing sync", err);
      throw err;
    }
  },
  reset: () => void get().hydrate(),
}));

export type StockState = "In stock" | "Low stock" | "Out of stock" | "Backorder";
export function stockStateOf(r: StockRow): StockState {
  const avail = r.onHand - r.reserved;
  if (r.onHand === 0) return "Out of stock";
  if (avail <= 0) return "Backorder";
  if (r.onHand <= r.reorderPoint) return "Low stock";
  return "In stock";
}

export function productForRow(row: StockRow): Product | undefined {
  const found = getAllProducts().find((p) => p.id === row.productId);
  if (found) return found;
  if (!row.productName) return undefined;
  return {
    id: row.productId,
    brand: row.brand ?? "",
    name: row.productName,
    price: 0,
    image: row.image || "",
    category: "",
    sizes: [],
    colors: [],
    availability: "In Stock",
  };
}
