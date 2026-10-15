import { useEffect, useMemo } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import {
  useProductAnalytics, CATEGORY_LABEL,
  type Range, type Category,
} from "@/lib/analytics-products-store";
import { formatKpiDelta, kpiDeltaFraction } from "@/lib/analytics-kpi";
import { downloadCSV } from "@/lib/admin-export";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, ScatterChart, Scatter, ZAxis,
} from "recharts";
import {
  Package, ShoppingBag, TrendingUp, TrendingDown, Download,
  AlertTriangle, Search, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months",
};

const CAT_COLORS = ["#0f0f0f", "#b8935a", "#4b6cb7", "#8b5cf6", "#059669"];

export function AdminAnalyticsProducts() {
  const {
    range, category, sort, setRange, setCategory, setSort, hydrate,
    rows, categories, brands, slowMovers, topSearches, zeroResults,
    totalRevenue, totalUnits, totalViews, avgConv, avgMargin, liveCount, lowStock, outOfStock, kpis,
  } = useProductAnalytics();

  useEffect(() => {
    void hydrate({ range, category, sort });
  }, [range, category, sort, hydrate]);

  const data = useMemo(
    () => ({
      rows, categories, brands, slowMovers, topSearches, zeroResults,
      totalRevenue, totalUnits, totalViews, avgConv, avgMargin, liveCount, lowStock, outOfStock,
    }),
    [rows, categories, brands, slowMovers, topSearches, zeroResults,
      totalRevenue, totalUnits, totalViews, avgConv, avgMargin, liveCount, lowStock, outOfStock],
  );

  const sortedRows = useMemo(() => {
    const rows = [...data.rows];
    rows.sort((a, b) => {
      switch (sort) {
        case "units": return b.units - a.units;
        case "views": return b.views - a.views;
        case "conv": return b.conv - a.conv;
        case "margin": return b.grossMargin - a.grossMargin;
        default: return b.revenue - a.revenue;
      }
    });
    return rows;
  }, [data.rows, sort]);

  const top10 = sortedRows.slice(0, 10);
  const scatter = data.rows.map((r) => ({
    x: r.views,
    y: r.conv * 100,
    z: r.revenue / 1_000_000,
    name: r.name,
  }));

  const exportRows = () => {
    downloadCSV(
      `product-analytics-${range}-${Date.now()}.csv`,
      sortedRows.map((r) => ({
        id: r.id,
        name: r.name,
        brand: r.brand,
        category: r.category,
        units: r.units,
        revenue: r.revenue,
        views: r.views,
        conversion: (r.conv * 100).toFixed(2),
        margin: (r.grossMargin * 100).toFixed(2),
        refund_rate: (r.refundRate * 100).toFixed(2),
        stock: r.stock,
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Product analytics"
        subtitle="Bestsellers, funnel efficiency, margin and inventory velocity across the catalog."
        actions={
          <button
            onClick={exportRows}
            className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] inline-flex items-center gap-2 hover:bg-black/[0.04]"
          >
            <Download className="h-4 w-4" /> Export
          </button>
        }
      />

      {/* filters */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <div className="inline-flex rounded-md border border-black/10 bg-white overflow-hidden">
          {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 h-9 text-[12px] ${range === r ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"}`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_LABEL) as (keyof typeof CATEGORY_LABEL)[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <div className="ml-auto text-[12px] text-muted-foreground">
          {RANGE_LABEL[range]} · {data.liveCount} active SKUs
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Revenue" value={naira(data.totalRevenue)} delta={kpiDeltaFraction(kpis.revenue)} icon={<ShoppingBag className="h-4 w-4" />} />
        <KPI label="Units sold" value={data.totalUnits.toLocaleString()} delta={kpiDeltaFraction(kpis.units)} icon={<Package className="h-4 w-4" />} />
        <KPI label="Avg. conversion" value={`${(data.avgConv * 100).toFixed(2)}%`} delta={kpiDeltaFraction(kpis.avgConv)} />
        <KPI label="Avg. margin" value={`${(data.avgMargin * 100).toFixed(1)}%`} delta={kpiDeltaFraction(kpis.avgMargin)} invert />
      </div>

      {/* inventory alerts */}
      {(data.lowStock > 0 || data.outOfStock > 0) && (
        <Card className="mb-5 !p-4 border-amber-200 bg-amber-50/50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-amber-100 grid place-items-center text-amber-700">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="text-[13px] text-ink font-medium">Inventory attention required</div>
              <div className="text-[12px] text-muted-foreground">
                {data.lowStock} SKU{data.lowStock === 1 ? "" : "s"} at low stock · {data.outOfStock} out of stock.
              </div>
            </div>
            <a href="/inventory" className="text-[12px] text-ink underline underline-offset-4">Manage inventory</a>
          </div>
        </Card>
      )}

      {/* Top revenue bars + Category donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Top 10 by {sort}</div>
              <div className="font-display font-semibold text-lg">Best performers</div>
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="h-8 px-2 rounded-md border border-black/10 bg-white text-[12px]"
            >
              <option value="revenue">Revenue</option>
              <option value="units">Units</option>
              <option value="views">Views</option>
              <option value="conv">Conversion</option>
              <option value="margin">Margin</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => sort === "conv" || sort === "margin"
                    ? `${(v * 100).toFixed(0)}%`
                    : sort === "revenue" ? `₦${(v / 1_000_000).toFixed(0)}M`
                    : v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <YAxis
                  dataKey="name" type="category"
                  tick={{ fontSize: 11, fill: "#111" }}
                  axisLine={false} tickLine={false} width={180}
                  tickFormatter={(v) => (v as string).length > 26 ? `${(v as string).slice(0, 26)}…` : (v as string)}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  formatter={(v: number) =>
                    sort === "revenue" ? [naira(v), "Revenue"]
                    : sort === "units" ? [v.toLocaleString(), "Units"]
                    : sort === "views" ? [v.toLocaleString(), "Views"]
                    : [`${(v * 100).toFixed(2)}%`, sort === "conv" ? "Conversion" : "Margin"]
                  }
                />
                <Bar dataKey={sort === "conv" ? "conv" : sort === "margin" ? "grossMargin" : sort} radius={[0, 6, 6, 0]}>
                  {top10.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Category share</div>
          <div className="font-display font-semibold text-lg mb-3">Revenue mix</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.categories} dataKey="revenue" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                  {data.categories.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, p) => [naira(v), (p as { payload: { name: string } }).payload.name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.categories.map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                  <span className="text-ink">{c.name}</span>
                </div>
                <div className="text-muted-foreground tabular-nums">{naira(c.revenue)}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Views vs Conversion scatter + top brands */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Views vs conversion</div>
              <div className="font-display font-semibold text-lg">Efficiency matrix</div>
            </div>
            <div className="text-[11px] text-muted-foreground">Bubble = revenue</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis
                  type="number" dataKey="x" name="Views"
                  tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
                />
                <YAxis
                  type="number" dataKey="y" name="Conversion"
                  tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${v.toFixed(1)}%`}
                />
                <ZAxis type="number" dataKey="z" range={[40, 400]} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, n) => {
                    if (n === "x") return [v.toLocaleString(), "Views"];
                    if (n === "y") return [`${v.toFixed(2)}%`, "Conversion"];
                    return [`₦${v.toFixed(1)}M`, "Revenue"];
                  }}
                  labelFormatter={(_l, p) => (p?.[0]?.payload as { name: string } | undefined)?.name ?? ""}
                />
                <Scatter data={scatter} fill="#0f0f0f" fillOpacity={0.75} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Top brands</div>
          <div className="font-display font-semibold text-lg mb-3">By revenue</div>
          <div className="space-y-2.5">
            {data.brands.map((b) => {
              const max = data.brands[0].revenue;
              return (
                <div key={b.name}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <div className="text-ink">{b.name}</div>
                    <div className="text-muted-foreground tabular-nums">{naira(b.revenue)}</div>
                  </div>
                  <div className="h-2 rounded-full bg-black/[0.05] overflow-hidden">
                    <div className="h-full bg-ink" style={{ width: `${(b.revenue / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Slow movers + Search insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Card padded={false}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Slow movers</div>
              <div className="font-display font-semibold text-lg">High days-on-hand</div>
            </div>
            <Chip tone="amber">{data.slowMovers.length}</Chip>
          </div>
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.02] text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Product</th>
                  <th className="px-4 py-2.5 font-medium text-right">Stock</th>
                  <th className="px-4 py-2.5 font-medium text-right">Sold</th>
                  <th className="px-4 py-2.5 font-medium text-right">Days on hand</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.slowMovers.map((r) => (
                  <tr key={r.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-ink">{r.name}</div>
                      <div className="text-[11px] text-muted-foreground">{r.brand}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-sans">{r.stock}</td>
                    <td className="px-4 py-3 text-right font-sans">{r.units}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={r.dayOnHand > 60 ? "text-rose-600 font-medium" : "text-amber-700"}>
                        {r.dayOnHand === 999 ? " - " : `${r.dayOnHand}d`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>

        <Card padded={false}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Top searches</div>
              <div className="font-display font-semibold text-lg">On-site search</div>
            </div>
            <Chip tone="neutral"><Search className="h-3 w-3" /> {data.topSearches.length}</Chip>
          </div>
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.02] text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Term</th>
                  <th className="px-4 py-2.5 font-medium text-right">Volume</th>
                  <th className="px-4 py-2.5 font-medium text-right">Conv.</th>
                  <th className="px-4 py-2.5 font-medium text-right">Results</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.topSearches.map((s) => (
                  <tr key={s.term} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-ink">{s.term}</td>
                    <td className="px-4 py-3 text-right font-sans">{s.volume.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-ink tabular-nums">{(s.conv * 100).toFixed(1)}%</td>
                    <td className="px-4 py-3 text-right font-sans text-muted-foreground">{s.results}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
          <div className="px-5 py-3 border-t border-black/[0.06]">
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-2">Zero-result searches</div>
            <div className="flex flex-wrap gap-1.5">
              {data.zeroResults.map((z) => (
                <span key={z.term} className="text-[11px] px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700">
                  {z.term} · {z.volume}
                </span>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* full product table */}
      <Card padded={false}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">All products</div>
            <div className="font-display font-semibold text-lg">Performance detail</div>
          </div>
          <Chip tone="neutral">{sortedRows.length} SKUs</Chip>
        </div>
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium text-right">Views</th>
                <th className="px-4 py-2.5 font-medium text-right">ATC</th>
                <th className="px-4 py-2.5 font-medium text-right">Units</th>
                <th className="px-4 py-2.5 font-medium text-right">Conv.</th>
                <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-4 py-2.5 font-medium text-right">Margin</th>
                <th className="px-4 py-2.5 font-medium text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {sortedRows.map((r) => (
                <tr key={r.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <div className="text-ink">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">{r.brand} · {r.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{CATEGORY_LABEL[r.category]}</td>
                  <td className="px-4 py-3 text-right font-sans">{r.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-sans text-muted-foreground">{r.addToCart.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-sans">{r.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{(r.conv * 100).toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right font-sans text-ink">{naira(r.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={r.grossMargin >= 0.4 ? "text-ink" : "text-muted-foreground"}>
                      {(r.grossMargin * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center gap-1 text-[12px] ${r.trend === "up" ? "text-ink" : "text-rose-700"}`}>
                      {r.trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                      {(r.trendPct * 100).toFixed(0)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}

function KPI({
  label, value, delta, icon, invert = false,
}: { label: string; value: string; delta: number | null; icon?: React.ReactNode; invert?: boolean }) {
  const up = delta != null ? delta >= 0 : true;
  const good = delta == null ? true : invert ? !up : up;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="font-display text-[22px] font-bold mt-1">{value}</div>
      <div className={`text-[12px] inline-flex items-center gap-1 mt-1 ${delta == null ? "text-muted-foreground" : good ? "text-ink" : "text-rose-700"}`}>
        {delta != null && (up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
        {formatKpiDelta(delta)}
      </div>
    </Card>
  );
}
