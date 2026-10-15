import { create } from "zustand";
import { analyticsAdminApi } from "@/lib/api/platform";
import { koboToNaira } from "@/lib/api/client";
import { mapAnalyticsKpis, type AnalyticsKpi } from "@/lib/analytics-kpi";

export type Range = "7d" | "30d" | "90d" | "12m";
export type Category = "all" | "footwear" | "fashion" | "fragrance" | "accessories" | "jewellery";

export const CATEGORY_LABEL: Record<Exclude<Category, "all">, string> = {
  footwear: "Footwear",
  fashion: "Fashion",
  fragrance: "Fragrance",
  accessories: "Accessories",
  jewellery: "Jewellery",
};

export type ProductAnalyticsRow = {
  id: string;
  name: string;
  brand: string;
  category: Exclude<Category, "all">;
  price: number;
  cost: number;
  stock: number;
  units: number;
  revenue: number;
  grossMargin: number;
  views: number;
  addToCart: number;
  conv: number;
  refundRate: number;
  trend: "up" | "down";
  trendPct: number;
  turnover: number;
};

export type ProductData = {
  rows: ProductAnalyticsRow[];
  categories: { name: string; revenue: number; units: number; views: number }[];
  brands: { name: string; revenue: number; units: number }[];
  slowMovers: (ProductAnalyticsRow & { dayOnHand: number })[];
  topSearches: { term: string; volume: number; conv: number; results: number }[];
  zeroResults: { term: string; volume: number }[];
  totalRevenue: number;
  totalUnits: number;
  totalViews: number;
  avgConv: number;
  avgMargin: number;
  liveCount: number;
  lowStock: number;
  outOfStock: number;
};

type Sort = "revenue" | "units" | "views" | "conv" | "margin";

type State = ProductData & {
  kpis: Record<string, AnalyticsKpi>;
  range: Range;
  category: Category;
  sort: Sort;
  hydrated: boolean;
  setRange: (r: Range) => void;
  setCategory: (c: Category) => void;
  setSort: (s: Sort) => void;
  hydrate: (filters?: { range?: Range; category?: Category; sort?: Sort }) => Promise<void>;
};

const emptyData = (): ProductData => ({
  rows: [],
  categories: [],
  brands: [],
  slowMovers: [],
  topSearches: [],
  zeroResults: [],
  totalRevenue: 0,
  totalUnits: 0,
  totalViews: 0,
  avgConv: 0,
  avgMargin: 0,
  liveCount: 0,
  lowStock: 0,
  outOfStock: 0,
});

function toCategoryKey(handle: string, name: string): Exclude<Category, "all"> {
  const h = handle.toLowerCase().replace(/[^a-z]/g, "");
  if (h in CATEGORY_LABEL) return h as Exclude<Category, "all">;
  const n = name.toLowerCase();
  for (const key of Object.keys(CATEGORY_LABEL) as Exclude<Category, "all">[]) {
    if (n.includes(key) || CATEGORY_LABEL[key].toLowerCase() === n) return key;
  }
  return "fashion";
}

function mapRow(p: Record<string, unknown>): ProductAnalyticsRow {
  const handle = String(p.categoryHandle ?? "");
  const catName = String(p.category ?? "");
  return {
    id: String(p.id ?? p.handle ?? ""),
    name: String(p.name ?? ""),
    brand: String(p.brand ?? ""),
    category: toCategoryKey(handle, catName),
    price: koboToNaira(Number(p.price ?? 0)),
    cost: koboToNaira(Number(p.cost ?? 0)),
    stock: Number(p.stock ?? 0),
    units: Number(p.units ?? 0),
    revenue: koboToNaira(Number(p.revenue ?? 0)),
    grossMargin: Number(p.grossMargin ?? 0),
    views: Number(p.views ?? 0),
    addToCart: Number(p.addToCart ?? 0),
    conv: Number(p.conv ?? 0),
    refundRate: Number(p.refundRate ?? 0),
    trend: p.trend === "down" ? "down" : "up",
    trendPct: Number(p.trendPct ?? 0),
    turnover: Number(p.turnover ?? 0),
  };
}

export const useProductAnalytics = create<State>()((set, get) => ({
  ...emptyData(),
  kpis: {},
  range: "30d",
  category: "all",
  sort: "revenue",
  hydrated: false,
  setRange: (range) => set({ range }),
  setCategory: (category) => set({ category }),
  setSort: (sort) => set({ sort }),
  hydrate: async (filters) => {
    const range = filters?.range ?? get().range;
    const category = filters?.category ?? get().category;
    const sort = filters?.sort ?? get().sort;
    try {
      const raw = await analyticsAdminApi.products({
        range,
        category: category === "all" ? "all" : category,
        sort,
        page: 1,
        pageSize: 200,
      });
      const d = raw as Record<string, unknown>;
      const rows = ((d.rows as Record<string, unknown>[]) ?? []).map(mapRow);
      const categories = ((d.categories as Record<string, unknown>[]) ?? []).map((c) => ({
        name: String(c.name ?? ""),
        revenue: koboToNaira(Number(c.revenue ?? 0)),
        units: Number(c.units ?? 0),
        views: Number(c.views ?? 0),
      }));
      const brands = ((d.brands as Record<string, unknown>[]) ?? []).map((b) => ({
        name: String(b.name ?? ""),
        revenue: koboToNaira(Number(b.revenue ?? 0)),
        units: Number(b.units ?? 0),
      }));
      const slowMovers = ((d.slowMovers as Record<string, unknown>[]) ?? []).map((r) => {
        const row = mapRow(r);
        const dayOnHand = Number(r.daysOnHand ?? r.dayOnHand ?? 999);
        return { ...row, dayOnHand: Number.isFinite(dayOnHand) ? dayOnHand : 999 };
      });
      const topSearches = ((d.topSearches as Record<string, unknown>[]) ?? []).map((s) => ({
        term: String(s.term ?? ""),
        volume: Number(s.volume ?? 0),
        conv: Number(s.conv ?? 0),
        results: Number(s.results ?? 0),
      }));
      const zeroResults = ((d.zeroResults as Record<string, unknown>[]) ?? []).map((z) => ({
        term: String(z.term ?? ""),
        volume: Number(z.volume ?? 0),
      }));
      const kpis = mapAnalyticsKpis(d.kpis, ["revenue"]);
      set({
        range,
        category,
        sort,
        hydrated: true,
        kpis,
        rows,
        categories,
        brands,
        slowMovers,
        topSearches,
        zeroResults,
        totalRevenue: koboToNaira(Number(d.totalRevenue ?? 0)),
        totalUnits: Number(d.totalUnits ?? 0),
        totalViews: Number(d.totalViews ?? 0),
        avgConv: Number(d.avgConv ?? 0),
        avgMargin: Number(d.avgMargin ?? 0),
        liveCount: Number(d.liveCount ?? rows.length),
        lowStock: Number(d.lowStock ?? 0),
        outOfStock: Number(d.outOfStock ?? 0),
      });
    } catch (err) {
      console.warn("[analytics-products] hydrate failed", err);
      set({ hydrated: true, range, category, sort });
    }
  },
}));

export function getProductData(_range?: Range, _category?: Category): ProductData {
  const s = useProductAnalytics.getState();
  return {
    rows: s.rows,
    categories: s.categories,
    brands: s.brands,
    slowMovers: s.slowMovers,
    topSearches: s.topSearches,
    zeroResults: s.zeroResults,
    totalRevenue: s.totalRevenue,
    totalUnits: s.totalUnits,
    totalViews: s.totalViews,
    avgConv: s.avgConv,
    avgMargin: s.avgMargin,
    liveCount: s.liveCount,
    lowStock: s.lowStock,
    outOfStock: s.outOfStock,
  };
}
