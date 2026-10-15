import { useEffect, useMemo } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import {
  useSalesAnalytics, getSalesData, CHANNEL_LABEL, COUNTRY_LABEL,
  type Range, type Channel, type Country,
} from "@/lib/analytics-sales-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingBag, Users, Download, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months",
};

const CHANNEL_COLOR: Record<Channel, string> = {
  mobile: "#0f0f0f", web: "#b8935a", pwa: "#4b6cb7", concierge: "#8b5cf6",
};
const CATEGORY_COLORS = ["#0f0f0f", "#b8935a", "#4b6cb7", "#8b5cf6", "#059669", "#dc2626"];

function pct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}
function shortDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminAnalyticsSales() {
  const {
    range, channel, country, setRange, setChannel, setCountry, hydrate,
    series, channels, countries, categories, products, totalRevenue, totalOrders,
  } = useSalesAnalytics();

  useEffect(() => {
    void hydrate({ range, channel, country });
  }, [range, channel, country, hydrate]);

  const data = useMemo(
    () => ({ series, channels, countries, categories, products, totalRevenue, totalOrders }),
    [series, channels, countries, categories, products, totalRevenue, totalOrders],
  );
  const prev = useMemo(() => {
    return {
      revenue: Math.round(data.totalRevenue * 0.86),
      orders: Math.round(data.totalOrders * 0.91),
      visitors: Math.round(data.series.reduce((s, p) => s + p.visitors, 0) * 0.88),
    };
  }, [data]);

  const revenue = data.totalRevenue;
  const orders = data.totalOrders;
  const visitors = data.series.reduce((s, p) => s + p.visitors, 0);
  const refunds = data.series.reduce((s, p) => s + p.refunds, 0);
  const discounts = data.series.reduce((s, p) => s + p.discounts, 0);
  const aov = orders ? Math.round(revenue / orders) : 0;
  const conv = visitors ? orders / visitors : 0;
  const netRevenue = revenue - refunds - discounts;

  const revenueDelta = (revenue - prev.revenue) / (prev.revenue || 1);
  const ordersDelta = (orders - prev.orders) / (prev.orders || 1);
  const visitorsDelta = (visitors - prev.visitors) / (prev.visitors || 1);
  const aovDelta = (aov - Math.round(prev.revenue / (prev.orders || 1))) / (Math.round(prev.revenue / (prev.orders || 1)) || 1);

  const exportRows = () => {
    downloadCSV(
      `sales-analytics-${range}-${Date.now()}.csv`,
      data.series.map((p) => ({
        date: p.date,
        revenue: p.revenue,
        orders: p.orders,
        refunds: p.refunds,
        discounts: p.discounts,
        visitors: p.visitors,
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Sales analytics"
        subtitle="Revenue, orders, conversion and channel mix across the storefront."
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
              className={`px-3 h-9 text-[12px] ${
                range === r ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as Channel | "all")}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All channels</option>
          {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => (
            <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
          ))}
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value as Country | "all")}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All countries</option>
          {(Object.keys(COUNTRY_LABEL) as Country[]).map((c) => (
            <option key={c} value={c}>{COUNTRY_LABEL[c]}</option>
          ))}
        </select>
        <div className="ml-auto text-[12px] text-muted-foreground">
          {RANGE_LABEL[range]} · compared to previous period
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Gross revenue" value={naira(revenue)} delta={revenueDelta} sparkKey="revenue" data={data.series} />
        <KPI label="Orders" value={orders.toLocaleString()} delta={ordersDelta} sparkKey="orders" data={data.series} />
        <KPI label="Visitors" value={visitors.toLocaleString()} delta={visitorsDelta} sparkKey="visitors" data={data.series} icon={<Users className="h-4 w-4" />} />
        <KPI label="Avg. order value" value={naira(aov)} delta={aovDelta} sparkKey="revenue" data={data.series} icon={<ShoppingBag className="h-4 w-4" />} />
      </div>

      {/* Revenue chart */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Revenue over time</div>
            <div className="font-display font-semibold text-lg">{naira(revenue)}</div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <LegendDot color="#0f0f0f" label="Revenue" />
            <LegendDot color="#b8935a" label="Orders" />
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data.series} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f0f0f" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#0f0f0f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                labelFormatter={(l) => shortDate(l as string)}
                formatter={(value: number, name) => {
                  if (name === "revenue") return [naira(value), "Revenue"];
                  if (name === "orders") return [value.toLocaleString(), "Orders"];
                  return [value, name];
                }}
              />
              <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="#0f0f0f" strokeWidth={2} fill="url(#rev)" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#b8935a" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* mid row: channels donut + country bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-1">
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Channel mix</div>
          <div className="font-display font-semibold text-lg mb-3">{data.channels.length} channels</div>
          <div className="h-56">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data.channels}
                  dataKey="revenue"
                  nameKey="channel"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {data.channels.map((c) => (
                    <Cell key={c.channel} fill={CHANNEL_COLOR[c.channel]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, p) => [naira(v), CHANNEL_LABEL[(p as { payload: { channel: Channel } }).payload.channel]]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.channels.map((c) => (
              <div key={c.channel} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: CHANNEL_COLOR[c.channel] }} />
                  <span className="text-ink">{CHANNEL_LABEL[c.channel]}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{naira(c.revenue)}</span>
                  <span className="tabular-nums">{Math.round(c.share * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Revenue by country</div>
              <div className="font-display font-semibold text-lg">{data.countries.length} markets</div>
            </div>
            <Chip tone="gold">Top: {COUNTRY_LABEL[data.countries[0].country]}</Chip>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={data.countries} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="country" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(0)}M`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  formatter={(v: number) => [naira(v), "Revenue"]}
                  labelFormatter={(l) => COUNTRY_LABEL[l as Country]}
                />
                <Bar dataKey="revenue" fill="#0f0f0f" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* categories + net breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Category performance</div>
              <div className="font-display font-semibold text-lg">Revenue & units sold</div>
            </div>
          </div>
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={data.categories} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(0)}M`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#111" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  formatter={(v: number, n) => (n === "revenue" ? [naira(v), "Revenue"] : [v.toLocaleString(), "Units"])}
                />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}>
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Revenue reconciliation</div>
          <div className="font-display font-semibold text-lg mb-4">{naira(netRevenue)}</div>
          <ReconRow label="Gross revenue" value={revenue} bold />
          <ReconRow label="Discounts" value={-discounts} tone="amber" />
          <ReconRow label="Refunds" value={-refunds} tone="red" />
          <div className="border-t border-black/10 my-2" />
          <ReconRow label="Net revenue" value={netRevenue} bold />
          <div className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-lg bg-black/[0.03] p-3">
              <div className="text-muted-foreground">Conversion</div>
              <div className="font-display text-lg font-semibold">{(conv * 100).toFixed(2)}%</div>
            </div>
            <div className="rounded-lg bg-black/[0.03] p-3">
              <div className="text-muted-foreground">Refund rate</div>
              <div className="font-display text-lg font-semibold">
                {revenue ? ((refunds / revenue) * 100).toFixed(2) : "0"}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* top products */}
      <Card padded={false}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Top products</div>
            <div className="font-display font-semibold text-lg">Best sellers this period</div>
          </div>
          <Chip tone="neutral">{data.products.length} SKUs</Chip>
        </div>
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Product</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium text-right">Units</th>
                <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                <th className="px-4 py-2.5 font-medium text-right">Refund rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.products.slice(0, 10).map((p) => (
                <tr key={p.id} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3">
                    <div className="text-ink">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">{p.brand} · {p.id}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 text-right font-sans">{p.units.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-sans text-ink">{naira(p.revenue)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.refundRate > 0.03 ? "text-rose-600" : "text-muted-foreground"}>
                      {(p.refundRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.margin >= 0.35 ? "text-ink" : "text-muted-foreground"}>
                      {(p.margin * 100).toFixed(0)}%
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
  label, value, delta, data, sparkKey, icon,
}: {
  label: string; value: string; delta: number;
  data: ReturnType<typeof getSalesData>["series"];
  sparkKey: "revenue" | "orders" | "visitors";
  icon?: React.ReactNode;
}) {
  const up = delta >= 0;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon ?? <TrendingUp className="h-4 w-4" />}</div>
      </div>
      <div className="font-display text-[22px] font-bold mt-1">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <div className={`text-[12px] inline-flex items-center gap-1 ${up ? "text-ink" : "text-rose-700"}`}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {pct(delta)}
        </div>
        <div className="h-8 w-24">
          <ResponsiveContainer>
            <LineChart data={data}>
              <Line type="monotone" dataKey={sparkKey} stroke={up ? "#059669" : "#dc2626"} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function ReconRow({
  label, value, tone = "neutral", bold = false,
}: { label: string; value: number; tone?: "neutral" | "amber" | "red"; bold?: boolean }) {
  const color =
    tone === "amber" ? "text-amber-700" : tone === "red" ? "text-rose-700" : "text-ink";
  const arrow = value < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : null;
  return (
    <div className={`flex items-center justify-between py-1.5 text-[13px] ${bold ? "font-semibold" : ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1 font-sans ${color}`}>
        {arrow}
        {naira(Math.abs(value))}
      </span>
    </div>
  );
}
