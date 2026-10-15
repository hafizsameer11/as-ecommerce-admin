import { create } from "zustand";
import { analyticsAdminApi } from "@/lib/api/platform";
import { koboToNaira } from "@/lib/api/client";

export type Range = "7d" | "30d" | "90d" | "12m";
export type Priority = "all" | "standard" | "priority" | "vip";

export const PRIORITY_LABEL: Record<Exclude<Priority, "all">, string> = {
  standard: "Standard",
  priority: "Priority",
  vip: "VIP",
};

export type ConciergeData = {
  series: { date: string; requests: number; quotes: number; converted: number; sla: number }[];
  stages: { stage: string; count: number }[];
  categories: { name: string; requests: number; converted: number }[];
  agents: {
    id: string;
    name: string;
    handled: number;
    conv: number;
    csat: number;
    firstResponseMin: number;
    revenue: number;
  }[];
  suppliers: {
    name: string;
    fulfilled: number;
    onTime: number;
    defectRate: number;
    avgMargin: number;
  }[];
  reasons: { reason: string; pct: number }[];
  totalRequests: number;
  totalQuotes: number;
  totalConverted: number;
  gmv: number;
  aov: number;
  conversion: number;
  slaPct: number;
  firstResponseMin: number;
  avgQuoteHours: number;
  avgFulfillmentDays: number;
  openTickets: number;
};

type State = ConciergeData & {
  range: Range;
  priority: Priority;
  hydrated: boolean;
  setRange: (r: Range) => void;
  setPriority: (p: Priority) => void;
  hydrate: (filters?: { range?: Range; priority?: Priority }) => Promise<void>;
};

const emptyData = (): ConciergeData => ({
  series: [],
  stages: [],
  categories: [],
  agents: [],
  suppliers: [],
  reasons: [],
  totalRequests: 0,
  totalQuotes: 0,
  totalConverted: 0,
  gmv: 0,
  aov: 0,
  conversion: 0,
  slaPct: 0,
  firstResponseMin: 0,
  avgQuoteHours: 0,
  avgFulfillmentDays: 0,
  openTickets: 0,
});

export const useConciergeAnalytics = create<State>()((set, get) => ({
  ...emptyData(),
  range: "30d",
  priority: "all",
  hydrated: false,
  setRange: (range) => set({ range }),
  setPriority: (priority) => set({ priority }),
  hydrate: async (filters) => {
    const range = filters?.range ?? get().range;
    const priority = filters?.priority ?? get().priority;
    try {
      const raw = await analyticsAdminApi.concierge({
        range,
        priority,
      });
      const d = raw as Record<string, unknown>;
      const slaPct = Number(d.slaPct ?? 0);
      const series = ((d.series as Record<string, unknown>[]) ?? []).map((p) => ({
        date: String(p.date),
        requests: Number(p.requests ?? 0),
        quotes: Number(p.quotes ?? 0),
        converted: Number(p.converted ?? 0),
        sla: Number(p.sla ?? slaPct),
      }));
      const stages = ((d.stages as Record<string, unknown>[]) ?? []).map((s) => ({
        stage: String(s.stage ?? ""),
        count: Number(s.count ?? 0),
      }));
      const categories = ((d.categories as Record<string, unknown>[]) ?? []).map((c) => ({
        name: String(c.name ?? ""),
        requests: Number(c.requests ?? 0),
        converted: Number(c.converted ?? 0),
      }));
      const agents = ((d.agents as Record<string, unknown>[]) ?? []).map((a) => ({
        id: String(a.id ?? ""),
        name: String(a.name ?? ""),
        handled: Number(a.handled ?? 0),
        conv: Number(a.conv ?? 0),
        csat: Number(a.csat ?? 0),
        firstResponseMin: Number(a.firstResponseMin ?? 0),
        revenue: koboToNaira(Number(a.revenue ?? 0)),
      }));
      const suppliers = ((d.suppliers as Record<string, unknown>[]) ?? []).map((s) => {
        const handled = Number(s.handled ?? 0);
        const fulfilled = Number(s.fulfilled ?? 0);
        return {
          name: String(s.name ?? ""),
          fulfilled,
          onTime: Number(s.onTime ?? (handled ? fulfilled / handled : 0)),
          defectRate: Number(s.defectRate ?? 0),
          avgMargin: Number(s.avgMargin ?? 0),
        };
      });
      const reasons = ((d.reasons as Record<string, unknown>[]) ?? []).map((r) => ({
        reason: String(r.reason ?? ""),
        pct: Number(r.pct ?? 0),
      }));
      set({
        range,
        priority,
        hydrated: true,
        series,
        stages,
        categories,
        agents,
        suppliers,
        reasons,
        totalRequests: Number(d.totalRequests ?? 0),
        totalQuotes: Number(d.totalQuotes ?? 0),
        totalConverted: Number(d.totalConverted ?? 0),
        gmv: koboToNaira(Number(d.gmv ?? 0)),
        aov: koboToNaira(Number(d.aov ?? 0)),
        conversion: Number(d.conversion ?? 0),
        slaPct,
        firstResponseMin: Number(d.firstResponseMin ?? 0),
        avgQuoteHours: Number(d.avgQuoteHours ?? 0),
        avgFulfillmentDays: Number(d.avgFulfillmentDays ?? 0),
        openTickets: Number(d.openRequests ?? d.openTickets ?? 0),
      });
    } catch (err) {
      console.warn("[analytics-concierge] hydrate failed", err);
      set({ hydrated: true, range, priority });
    }
  },
}));

export function getConciergeData(_range?: Range, _priority?: Priority): ConciergeData {
  const s = useConciergeAnalytics.getState();
  return {
    series: s.series,
    stages: s.stages,
    categories: s.categories,
    agents: s.agents,
    suppliers: s.suppliers,
    reasons: s.reasons,
    totalRequests: s.totalRequests,
    totalQuotes: s.totalQuotes,
    totalConverted: s.totalConverted,
    gmv: s.gmv,
    aov: s.aov,
    conversion: s.conversion,
    slaPct: s.slaPct,
    firstResponseMin: s.firstResponseMin,
    avgQuoteHours: s.avgQuoteHours,
    avgFulfillmentDays: s.avgFulfillmentDays,
    openTickets: s.openTickets,
  };
}
