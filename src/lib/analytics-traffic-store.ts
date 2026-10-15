import { create } from "zustand";
import { analyticsAdminApi } from "@/lib/api/platform";

export type Range = "7d" | "30d" | "90d" | "12m";
export type Device = "all" | "mobile" | "desktop" | "tablet";

export const SOURCE_LABEL = {
  direct: "Direct",
  organic: "Organic search",
  social: "Social",
  paid: "Paid ads",
  email: "Email",
  referral: "Referral",
} as const;
export type Source = keyof typeof SOURCE_LABEL;

export const DEVICE_LABEL: Record<Exclude<Device, "all">, string> = {
  mobile: "Mobile",
  desktop: "Desktop",
  tablet: "Tablet",
};

export type TrafficPoint = {
  date: string;
  visitors: number;
  sessions: number;
  pageviews: number;
  bounces: number;
};

export type TrafficData = {
  series: TrafficPoint[];
  sources: { source: Source; visitors: number; sessions: number; conv: number; share: number }[];
  devices: { device: Exclude<Device, "all">; visitors: number; share: number }[];
  countries: { country: string; visitors: number }[];
  pages: { path: string; title: string; views: number; avgTimeSec: number; exitRate: number }[];
  referrers: { host: string; visitors: number }[];
  funnel: { stage: string; value: number }[];
  totalVisitors: number;
  totalSessions: number;
  totalPageviews: number;
  bounceRate: number;
  avgSessionSec: number;
  pagesPerSession: number;
};

type State = TrafficData & {
  range: Range;
  device: Device;
  source: Source | "all";
  hydrated: boolean;
  setRange: (r: Range) => void;
  setDevice: (d: Device) => void;
  setSource: (s: Source | "all") => void;
  hydrate: (filters?: { range?: Range; device?: Device; source?: Source | "all" }) => Promise<void>;
};

const emptyData = (): TrafficData => ({
  series: [],
  sources: [],
  devices: [],
  countries: [],
  pages: [],
  referrers: [],
  funnel: [],
  totalVisitors: 0,
  totalSessions: 0,
  totalPageviews: 0,
  bounceRate: 0,
  avgSessionSec: 0,
  pagesPerSession: 0,
});

function titleFromPath(path: string) {
  if (!path || path === "/") return "Home";
  const seg = path.split("?")[0].split("/").filter(Boolean).pop() ?? path;
  return seg.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function asSource(v: unknown): Source | null {
  if (typeof v !== "string") return null;
  return v in SOURCE_LABEL ? (v as Source) : null;
}

export const useTrafficAnalytics = create<State>()((set, get) => ({
  ...emptyData(),
  range: "30d",
  device: "all",
  source: "all",
  hydrated: false,
  setRange: (range) => set({ range }),
  setDevice: (device) => set({ device }),
  setSource: (source) => set({ source }),
  hydrate: async (filters) => {
    const range = filters?.range ?? get().range;
    const device = filters?.device ?? get().device;
    const source = filters?.source ?? get().source;
    try {
      const raw = await analyticsAdminApi.traffic({
        range,
        device,
        source: source === "all" ? "all" : source,
      });
      const d = raw as Record<string, unknown>;
      const series: TrafficPoint[] = ((d.series as Record<string, unknown>[]) ?? []).map((p) => ({
        date: String(p.date),
        visitors: Number(p.visitors ?? 0),
        sessions: Number(p.sessions ?? 0),
        pageviews: Number(p.pageviews ?? 0),
        bounces: Number(p.bounces ?? 0),
      }));
      const sources = ((d.sources as Record<string, unknown>[]) ?? [])
        .map((s) => {
          const src = asSource(s.source);
          if (!src) return null;
          return {
            source: src,
            visitors: Number(s.visitors ?? 0),
            sessions: Number(s.sessions ?? 0),
            conv: Number(s.conv ?? 0),
            share: Number(s.share ?? 0),
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== null);
      const devices = ((d.devices as Record<string, unknown>[]) ?? [])
        .map((x) => {
          const dev = x.device as Exclude<Device, "all">;
          if (dev !== "mobile" && dev !== "desktop" && dev !== "tablet") return null;
          return {
            device: dev,
            visitors: Number(x.visitors ?? 0),
            share: Number(x.share ?? 0),
          };
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      const countries = ((d.countries as Record<string, unknown>[]) ?? []).map((c) => ({
        country: String(c.country ?? "ZZ"),
        visitors: Number(c.visitors ?? 0),
      }));
      const pages = ((d.pages as Record<string, unknown>[]) ?? []).map((p) => {
        const path = String(p.path ?? "/");
        return {
          path,
          title: String(p.title ?? titleFromPath(path)),
          views: Number(p.views ?? 0),
          avgTimeSec: Number(p.avgTimeSec ?? 0),
          exitRate: Number(p.exitRate ?? 0),
        };
      });
      const referrers = ((d.referrers as Record<string, unknown>[]) ?? []).map((r) => ({
        host: String(r.host ?? ""),
        visitors: Number(r.visitors ?? 0),
      }));
      const funnel = ((d.funnel as Record<string, unknown>[]) ?? []).map((f) => ({
        stage: String(f.stage ?? ""),
        value: Number(f.value ?? 0),
      }));
      set({
        range,
        device,
        source,
        hydrated: true,
        series,
        sources,
        devices,
        countries,
        pages,
        referrers,
        funnel,
        totalVisitors: Number(d.totalVisitors ?? 0),
        totalSessions: Number(d.totalSessions ?? 0),
        totalPageviews: Number(d.totalPageviews ?? 0),
        bounceRate: Number(d.bounceRate ?? 0),
        avgSessionSec: Number(d.avgSessionSec ?? 0),
        pagesPerSession: Number(d.pagesPerSession ?? 0),
      });
    } catch (err) {
      console.warn("[analytics-traffic] hydrate failed", err);
      set({ hydrated: true, range, device, source });
    }
  },
}));

export function getTrafficData(
  _range?: Range,
  _device?: Device,
  _source?: Source | "all",
): TrafficData {
  const s = useTrafficAnalytics.getState();
  return {
    series: s.series,
    sources: s.sources,
    devices: s.devices,
    countries: s.countries,
    pages: s.pages,
    referrers: s.referrers,
    funnel: s.funnel,
    totalVisitors: s.totalVisitors,
    totalSessions: s.totalSessions,
    totalPageviews: s.totalPageviews,
    bounceRate: s.bounceRate,
    avgSessionSec: s.avgSessionSec,
    pagesPerSession: s.pagesPerSession,
  };
}
