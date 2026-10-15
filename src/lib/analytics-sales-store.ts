import { create } from "zustand";
import { analyticsAdminApi } from "@/lib/api/platform";
import { koboToNaira } from "@/lib/api/client";

export type Channel = "web" | "mobile" | "pwa" | "concierge";
export type Country = "NG" | "GB" | "US" | "AE" | "GH" | "ZA" | "KE";

export type SalesPoint = {
  date: string; // yyyy-mm-dd
  revenue: number; // gross (naira)
  orders: number;
  refunds: number;
  discounts: number;
  visitors: number;
};

export type ChannelSlice = { channel: Channel; revenue: number; orders: number; aov: number; share: number };
export type CountrySlice = { country: Country; revenue: number; orders: number };
export type CategorySlice = { name: string; revenue: number; units: number };
export type ProductRow = {
  id: string;
  name: string;
  brand: string;
  category: string;
  units: number;
  revenue: number;
  refundRate: number;
  margin: number;
};

const CHANNEL_LABEL: Record<Channel, string> = {
  web: "Web",
  mobile: "Mobile App",
  pwa: "PWA",
  concierge: "Concierge",
};
const COUNTRY_LABEL: Record<Country, string> = {
  NG: "Nigeria",
  GB: "United Kingdom",
  US: "United States",
  AE: "UAE",
  GH: "Ghana",
  ZA: "South Africa",
  KE: "Kenya",
};

const CHANNELS = new Set<Channel>(["web", "mobile", "pwa", "concierge"]);
const COUNTRIES = new Set<Country>(["NG", "GB", "US", "AE", "GH", "ZA", "KE"]);

export type Range = "7d" | "30d" | "90d" | "12m";
export const RANGE_DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90, "12m": 365 };

export type SalesData = {
  series: SalesPoint[];
  channels: ChannelSlice[];
  countries: CountrySlice[];
  categories: CategorySlice[];
  products: ProductRow[];
  totalRevenue: number;
  totalOrders: number;
};

type State = SalesData & {
  range: Range;
  channel: Channel | "all";
  country: Country | "all";
  hydrated: boolean;
  setRange: (r: Range) => void;
  setChannel: (c: Channel | "all") => void;
  setCountry: (c: Country | "all") => void;
  hydrate: (filters?: { range?: Range; channel?: Channel | "all"; country?: Country | "all" }) => Promise<void>;
};

const emptyData = (): SalesData => ({
  series: [],
  channels: [],
  countries: [],
  categories: [],
  products: [],
  totalRevenue: 0,
  totalOrders: 0,
});

function asChannel(v: unknown): Channel | null {
  return CHANNELS.has(v as Channel) ? (v as Channel) : null;
}

function asCountry(v: unknown): Country {
  const c = String(v ?? "NG").toUpperCase();
  return COUNTRIES.has(c as Country) ? (c as Country) : (c as Country);
}

export const useSalesAnalytics = create<State>()((set, get) => ({
  ...emptyData(),
  range: "30d",
  channel: "all",
  country: "all",
  hydrated: false,
  setRange: (range) => set({ range }),
  setChannel: (channel) => set({ channel }),
  setCountry: (country) => set({ country }),
  hydrate: async (filters) => {
    const range = filters?.range ?? get().range;
    const channel = filters?.channel ?? get().channel;
    const country = filters?.country ?? get().country;
    try {
      const raw = await analyticsAdminApi.sales({
        range,
        channel: channel === "all" ? "all" : channel,
        country: country === "all" ? "all" : country,
      });
      const d = raw as Record<string, unknown>;
      const series: SalesPoint[] = ((d.series as Record<string, unknown>[]) ?? []).map((p) => ({
        date: String(p.date),
        revenue: koboToNaira(Number(p.revenue ?? 0)),
        orders: Number(p.orders ?? 0),
        refunds: koboToNaira(Number(p.refunds ?? 0)),
        discounts: koboToNaira(Number(p.discounts ?? 0)),
        visitors: Number(p.visitors ?? 0),
      }));
      const channels: ChannelSlice[] = ((d.channels as Record<string, unknown>[]) ?? [])
        .map((c) => {
          const ch = asChannel(c.channel);
          if (!ch) return null;
          return {
            channel: ch,
            revenue: koboToNaira(Number(c.revenue ?? 0)),
            orders: Number(c.orders ?? 0),
            aov: koboToNaira(Number(c.aov ?? 0)),
            share: Number(c.share ?? 0),
          };
        })
        .filter((c): c is ChannelSlice => c !== null);
      const countries: CountrySlice[] = ((d.countries as Record<string, unknown>[]) ?? []).map((c) => ({
        country: asCountry(c.country),
        revenue: koboToNaira(Number(c.revenue ?? 0)),
        orders: Number(c.orders ?? 0),
      }));
      const categories: CategorySlice[] = ((d.categories as Record<string, unknown>[]) ?? []).map((c) => ({
        name: String(c.name ?? "Other"),
        revenue: koboToNaira(Number(c.revenue ?? 0)),
        units: Number(c.units ?? 0),
      }));
      const products: ProductRow[] = ((d.products as Record<string, unknown>[]) ?? []).map((p) => ({
        id: String(p.id ?? p.handle ?? ""),
        name: String(p.name ?? ""),
        brand: String(p.brand ?? ""),
        category: String(p.category ?? ""),
        units: Number(p.units ?? 0),
        revenue: koboToNaira(Number(p.revenue ?? 0)),
        refundRate: Number(p.refundRate ?? 0),
        margin: Number(p.margin ?? 0),
      }));
      set({
        range,
        channel,
        country,
        hydrated: true,
        series,
        channels,
        countries,
        categories,
        products,
        totalRevenue: koboToNaira(Number(d.totalRevenue ?? 0)),
        totalOrders: Number(d.totalOrders ?? 0),
      });
    } catch (err) {
      console.warn("[analytics-sales] hydrate failed", err);
      set({ hydrated: true, range, channel, country });
    }
  },
}));

/** Snapshot of hydrated sales data (args kept for call-site compatibility). */
export function getSalesData(
  _range?: Range,
  _channel?: Channel | "all",
  _country?: Country | "all",
): SalesData {
  const s = useSalesAnalytics.getState();
  return {
    series: s.series,
    channels: s.channels,
    countries: s.countries,
    categories: s.categories,
    products: s.products,
    totalRevenue: s.totalRevenue,
    totalOrders: s.totalOrders,
  };
}

export { CHANNEL_LABEL, COUNTRY_LABEL };
