import { create } from "zustand";
import { analyticsAdminApi } from "@/lib/api/platform";
import { koboToNaira } from "@/lib/api/client";

export type Window = "6m" | "12m" | "24m";
export type Metric = "retention" | "revenue" | "orders";

export type CohortRow = {
  label: string;
  newCustomers: number;
  row: (number | null)[];
};

export type CohortData = {
  cohorts: CohortRow[];
  curve: { month: number; value: number }[];
  ltv: { month: number; ltv: number }[];
  segments: { name: string; size: number; retention: number; ltv: number }[];
  totalNew: number;
  m1: number;
  m3: number;
  m6: number;
  m12: number;
  size: number;
};

type State = CohortData & {
  window: Window;
  metric: Metric;
  hydrated: boolean;
  setWindow: (w: Window) => void;
  setMetric: (m: Metric) => void;
  hydrate: (filters?: { window?: Window; metric?: Metric }) => Promise<void>;
};

const emptyData = (): CohortData => ({
  cohorts: [],
  curve: [],
  ltv: [],
  segments: [],
  totalNew: 0,
  m1: 0,
  m3: 0,
  m6: 0,
  m12: 0,
  size: 12,
});

export const useCohortAnalytics = create<State>()((set, get) => ({
  ...emptyData(),
  window: "12m",
  metric: "retention",
  hydrated: false,
  setWindow: (window) => set({ window }),
  setMetric: (metric) => set({ metric }),
  hydrate: async (filters) => {
    const window = filters?.window ?? get().window;
    const metric = filters?.metric ?? get().metric;
    try {
      const raw = await analyticsAdminApi.cohorts({ window, metric });
      const d = raw as Record<string, unknown>;
      const money = metric === "revenue";
      const cohorts: CohortRow[] = ((d.cohorts as Record<string, unknown>[]) ?? []).map((c) => ({
        label: String(c.label ?? c.month ?? ""),
        newCustomers: Number(c.newCustomers ?? 0),
        row: ((c.row as (number | null)[]) ?? []).map((v) => {
          if (v === null || v === undefined) return null;
          return money ? koboToNaira(Number(v)) : Number(v);
        }),
      }));
      const curve = ((d.curve as Record<string, unknown>[]) ?? []).map((c) => ({
        month: Number(c.month ?? 0),
        value: money ? koboToNaira(Number(c.value ?? 0)) : Number(c.value ?? 0),
      }));
      const ltv = ((d.ltv as Record<string, unknown>[]) ?? []).map((c) => ({
        month: Number(c.month ?? 0),
        ltv: koboToNaira(Number(c.ltv ?? 0)),
      }));
      const segments = ((d.segments as Record<string, unknown>[]) ?? []).map((s) => ({
        name: String(s.name ?? ""),
        size: Number(s.size ?? 0),
        retention: Number(s.retention ?? 0),
        ltv: koboToNaira(Number(s.ltv ?? 0)),
      }));
      set({
        window,
        metric,
        hydrated: true,
        cohorts,
        curve,
        ltv,
        segments,
        totalNew: Number(d.totalNew ?? 0),
        m1: Number(d.m1 ?? 0),
        m3: Number(d.m3 ?? 0),
        m6: Number(d.m6 ?? 0),
        m12: Number(d.m12 ?? 0),
        size: Number(d.size ?? (cohorts.length || 12)),
      });
    } catch (err) {
      console.warn("[analytics-cohorts] hydrate failed", err);
      set({ hydrated: true, window, metric });
    }
  },
}));

export function getCohortData(_win?: Window, _metric?: Metric): CohortData {
  const s = useCohortAnalytics.getState();
  return {
    cohorts: s.cohorts,
    curve: s.curve,
    ltv: s.ltv,
    segments: s.segments,
    totalNew: s.totalNew,
    m1: s.m1,
    m3: s.m3,
    m6: s.m6,
    m12: s.m12,
    size: s.size,
  };
}
