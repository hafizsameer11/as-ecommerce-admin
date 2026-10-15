import { create } from "zustand";
import { dashboardAdminApi } from "@/lib/api/platform";
import { koboToNaira } from "@/lib/api/client";

export type DashboardRange = "7d" | "14d" | "30d" | "90d";

export type DashboardKpi = {
  value: number;
  previous: number;
  delta: number;
};

export type DashboardState = {
  range: DashboardRange;
  hydrated: boolean;
  kpis: {
    revenue: DashboardKpi;
    orders: DashboardKpi;
    aov: DashboardKpi;
    conversion: DashboardKpi;
    newCustomers: DashboardKpi;
    refundRate: DashboardKpi;
  };
  series: { date: string; revenue: number; orders: number }[];
  topProducts: {
    id: string;
    name: string;
    brand: string;
    imageUrl?: string | null;
    units: number;
    revenue: number;
  }[];
  topCategories: { name: string; revenue: number; units: number }[];
  ordersByStatus: { status: string; label: string; count: number }[];
  recentOrders: {
    id: string;
    number: string;
    total: number;
    items: number;
    status: string;
    statusLabel: string;
    paymentStatus: string;
    placedAt: string;
    customer: { id: string | null; name: string; email: string };
  }[];
  concierge: {
    open: number;
    byStatus: { status: string; label: string; count: number }[];
    funnel?: { stage: string; n: number }[];
  };
  lowStock: {
    variantId: string;
    sku: string;
    name: string;
    available: number;
    reorderPoint: number;
  }[];
  setRange: (range: DashboardRange) => void;
  hydrate: (range?: DashboardRange) => Promise<void>;
};

const emptyKpi = (): DashboardKpi => ({ value: 0, previous: 0, delta: 0 });

function mapKpi(raw: unknown): DashboardKpi {
  const k = (raw ?? {}) as Record<string, unknown>;
  return {
    value: Number(k.value ?? 0),
    previous: Number(k.previous ?? 0),
    delta: Number(k.delta ?? 0),
  };
}

function pct(delta: number) {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${(delta * 100).toFixed(1)}%`;
}

export function formatDelta(delta: number, asPp = false) {
  if (asPp) {
    const sign = delta > 0 ? "+" : "";
    return `${sign}${(delta * 100).toFixed(1)}pp`;
  }
  return pct(delta);
}

export const useDashboard = create<DashboardState>()((set, get) => ({
  range: "14d",
  hydrated: false,
  kpis: {
    revenue: emptyKpi(),
    orders: emptyKpi(),
    aov: emptyKpi(),
    conversion: emptyKpi(),
    newCustomers: emptyKpi(),
    refundRate: emptyKpi(),
  },
  series: [],
  topProducts: [],
  topCategories: [],
  ordersByStatus: [],
  recentOrders: [],
  concierge: { open: 0, byStatus: [] },
  lowStock: [],
  setRange: (range) => {
    set({ range });
    void get().hydrate(range);
  },
  hydrate: async (rangeArg) => {
    const range = rangeArg ?? get().range;
    try {
      const raw = await dashboardAdminApi.get({ range });
      const d = raw as Record<string, unknown>;
      const kpisRaw = (d.kpis ?? {}) as Record<string, unknown>;
      const series = ((d.series as Record<string, unknown>[]) ?? []).map((s) => ({
        date: String(s.date),
        revenue: koboToNaira(Number(s.revenue ?? 0)),
        orders: Number(s.orders ?? 0),
      }));
      const topProducts = ((d.topProducts as Record<string, unknown>[]) ?? []).map((p) => ({
        id: String(p.id),
        name: String(p.name ?? ""),
        brand: String(p.brand ?? ""),
        imageUrl: (p.imageUrl as string | null) ?? null,
        units: Number(p.units ?? 0),
        revenue: koboToNaira(Number(p.revenue ?? 0)),
      }));
      const topCategories = ((d.topCategories as Record<string, unknown>[]) ?? []).map((c) => ({
        name: String(c.name ?? ""),
        revenue: koboToNaira(Number(c.revenue ?? 0)),
        units: Number(c.units ?? 0),
      }));
      const ordersByStatus = ((d.ordersByStatus as Record<string, unknown>[]) ?? []).map((o) => ({
        status: String(o.status),
        label: String(o.label ?? o.status),
        count: Number(o.count ?? 0),
      }));
      const recentOrders = ((d.recentOrders as Record<string, unknown>[]) ?? []).map((o) => {
        const customer = (o.customer ?? {}) as Record<string, unknown>;
        return {
          id: String(o.id),
          number: String(o.number ?? ""),
          total: koboToNaira(Number(o.total ?? 0)),
          items: Number(o.items ?? 0),
          status: String(o.status ?? ""),
          statusLabel: String(o.statusLabel ?? o.status ?? ""),
          paymentStatus: String(o.paymentStatus ?? ""),
          placedAt: o.placedAt ? new Date(o.placedAt as string).toISOString() : new Date().toISOString(),
          customer: {
            id: (customer.id as string | null) ?? null,
            name: String(customer.name ?? "Guest"),
            email: String(customer.email ?? ""),
          },
        };
      });
      const conciergeRaw = (d.concierge ?? {}) as Record<string, unknown>;
      const byStatus = ((conciergeRaw.byStatus as Record<string, unknown>[]) ?? []).map((s) => ({
        status: String(s.status),
        label: String(s.label ?? s.status),
        count: Number(s.count ?? 0),
      }));
      const funnelStages = ["new", "quoted", "approved", "sourcing", "shipped", "delivered"];
      const funnel = funnelStages.map((stage) => {
        const row = byStatus.find((s) => s.status === stage || s.label.toLowerCase().includes(stage));
        return { stage: row?.label ?? stage, n: row?.count ?? 0 };
      });
      const lowStock = ((d.lowStock as Record<string, unknown>[]) ?? []).map((l) => ({
        variantId: String(l.variantId ?? l.id ?? ""),
        sku: String(l.sku ?? ""),
        name: String(l.name ?? ""),
        available: Number(l.available ?? 0),
        reorderPoint: Number(l.reorderPoint ?? 0),
      }));

      const revenueKpi = mapKpi(kpisRaw.revenue);
      const ordersKpi = mapKpi(kpisRaw.orders);
      const aovKpi = mapKpi(kpisRaw.aov);
      set({
        range,
        hydrated: true,
        kpis: {
          revenue: { ...revenueKpi, value: koboToNaira(revenueKpi.value), previous: koboToNaira(revenueKpi.previous) },
          orders: ordersKpi,
          aov: { ...aovKpi, value: koboToNaira(aovKpi.value), previous: koboToNaira(aovKpi.previous) },
          conversion: mapKpi(kpisRaw.conversion),
          newCustomers: mapKpi(kpisRaw.newCustomers),
          refundRate: mapKpi(kpisRaw.refundRate),
        },
        series,
        topProducts,
        topCategories,
        ordersByStatus,
        recentOrders,
        concierge: {
          open: Number(conciergeRaw.open ?? 0),
          byStatus,
          funnel,
        },
        lowStock,
      });
    } catch (err) {
      console.warn("[dashboard] hydrate failed", err);
      set({ hydrated: true, range });
    }
  },
}));
