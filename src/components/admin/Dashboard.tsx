import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "./AdminShell";
import { useActivity, type ActivityType } from "@/lib/admin-activity-store";
import { formatDelta, useDashboard, type DashboardRange } from "@/lib/dashboard-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowUpRight, ArrowDownRight, Sparkles, Package, TrendingUp, ShoppingBag,
  RotateCcw, AlertTriangle, Wallet, Star, ChevronDown,
} from "lucide-react";

const ACT_LINK: Partial<Record<string, string>> = {
  "order.placed": "/orders",
  "order.shipped": "/orders",
  "order.refunded": "/returns",
  "concierge.requested": "/orders",
  "concierge.quoted": "/orders",
  "concierge.approved": "/orders",
  "catalog.updated": "/orders",
  "review.submitted": "/activity",
  "coupon.minted": "/activity",
  "payout.pending": "/transactions",
  "stock.low": "/activity",
  system: "/activity",
};

const naira = (n: number) => `₦${Math.round(n).toLocaleString()}`;

function KPI({
  label, value, delta, positive = true, icon: Icon, spark, to,
}: {
  label: string; value: string; delta: string; positive?: boolean;
  icon: any; spark: number[]; to?: string;
}) {
  const data = spark.map((v, i) => ({ i, v }));
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-gold" strokeWidth={2} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="font-display font-bold text-[26px] leading-none tabular-nums">{value}</div>
          <div className={`text-[11px] mt-1.5 flex items-center gap-1 ${positive ? "text-ink" : "text-rose-600"}`}>
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span className="font-semibold">{delta}</span>
            <span className="text-muted-foreground">vs prior</span>
          </div>
        </div>
        <div className="h-10 w-24">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`sp-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#CC5000" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#CC5000" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke="#CC5000" strokeWidth={1.5} fill={`url(#sp-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="bg-white border border-border rounded-lg p-4 hover:border-gold/40 transition-colors block">
        {inner}
      </Link>
    );
  }
  return <div className="bg-white border border-border rounded-lg p-4">{inner}</div>;
}

const ACT_META: Record<string, { color: string; icon: typeof Package }> = {
  "order.placed": { color: "bg-emerald-100 text-emerald-700", icon: ShoppingBag },
  "order.paid": { color: "bg-emerald-100 text-emerald-700", icon: Wallet },
  "order.shipped": { color: "bg-sky-100 text-sky-700", icon: Package },
  "order.cancelled": { color: "bg-rose-100 text-rose-700", icon: RotateCcw },
  "order.refunded": { color: "bg-rose-100 text-rose-700", icon: RotateCcw },
  "return.requested": { color: "bg-rose-100 text-rose-700", icon: RotateCcw },
  "concierge.requested": { color: "bg-violet-100 text-violet-700", icon: Sparkles },
  "concierge.quoted": { color: "bg-violet-100 text-violet-700", icon: Sparkles },
  "concierge.approved": { color: "bg-violet-100 text-violet-700", icon: Sparkles },
  "catalog.updated": { color: "bg-zinc-100 text-zinc-700", icon: Package },
  "review.submitted": { color: "bg-amber-100 text-amber-700", icon: Star },
  "coupon.minted": { color: "bg-violet-100 text-violet-700", icon: Wallet },
  "payout.pending": { color: "bg-amber-100 text-amber-700", icon: Wallet },
  "payout.paid": { color: "bg-emerald-100 text-emerald-700", icon: Wallet },
  "ticket.created": { color: "bg-sky-100 text-sky-700", icon: Sparkles },
  "stock.low": { color: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  system: { color: "bg-zinc-100 text-zinc-700", icon: Sparkles },
};

const STATUS_COLORS: Record<string, string> = {
  Processing: "#F59E0B",
  processing: "#F59E0B",
  Shipped: "#0EA5E9",
  shipped: "#0EA5E9",
  Delivered: "#10B981",
  delivered: "#10B981",
  Cancelled: "#F43F5E",
  cancelled: "#F43F5E",
  Returned: "#71717A",
  returned: "#71717A",
  paid: "#10B981",
  pending: "#F59E0B",
};

function timeAgo(t: number) {
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const RANGES: { id: DashboardRange; days: number; label: string }[] = [
  { id: "7d", days: 7, label: "Last 7 days" },
  { id: "14d", days: 14, label: "Last 14 days" },
  { id: "30d", days: 30, label: "Last 30 days" },
  { id: "90d", days: 90, label: "Last 90 days" },
];

export function Dashboard() {
  const range = useDashboard((s) => s.range);
  const setRange = useDashboard((s) => s.setRange);
  const hydrateDash = useDashboard((s) => s.hydrate);
  const kpis = useDashboard((s) => s.kpis);
  const series = useDashboard((s) => s.series);
  const topCategories = useDashboard((s) => s.topCategories);
  const ordersByStatus = useDashboard((s) => s.ordersByStatus);
  const recentOrders = useDashboard((s) => s.recentOrders);
  const concierge = useDashboard((s) => s.concierge);
  const hydrateActivity = useActivity((s) => s.hydrate);
  const activity = useActivity((s) => s.entries).slice(0, 8);
  const [rangeOpen, setRangeOpen] = useState(false);

  useEffect(() => {
    void hydrateDash();
    void hydrateActivity();
  }, [hydrateDash, hydrateActivity]);

  const revenueByDay = useMemo(
    () =>
      series.map((s) => ({
        day: new Date(s.date).toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
        revenue: s.revenue,
      })),
    [series],
  );

  const statusData = useMemo(
    () => ordersByStatus.map((o) => ({ name: o.label || o.status, value: o.count, key: o.status })),
    [ordersByStatus],
  );

  const conciergeFunnel = useMemo(() => {
    if (concierge.funnel?.length) return concierge.funnel.filter((s) => s.n > 0 || true);
    return concierge.byStatus.map((s) => ({ stage: s.label, n: s.count }));
  }, [concierge]);

  const sparkFrom = (values: number[]) =>
    values.length ? values : [0, 0, 0, 0, 0, 0, 0, 0];

  const revenueSpark = sparkFrom(series.map((s) => s.revenue));
  const ordersSpark = sparkFrom(series.map((s) => s.orders));

  const currentRange = RANGES.find((r) => r.id === range) ?? RANGES[1];

  const exportReport = () => {
    downloadCSV(
      `asl-dashboard-${new Date().toISOString().slice(0, 10)}.csv`,
      recentOrders.map((o) => ({
        id: o.number || o.id,
        date: o.placedAt,
        status: o.statusLabel || o.status,
        items: o.items,
        payment: o.paymentStatus,
        total: o.total,
        customer: o.customer.email || o.customer.name,
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Dashboard"
        subtitle={`Live operational overview · ${currentRange.label.toLowerCase()}`}
        actions={
          <>
            <div className="relative">
              <button
                onClick={() => setRangeOpen((v) => !v)}
                className="h-9 px-3 rounded-md border border-border bg-white text-[12px] font-semibold hover:bg-black/5 flex items-center gap-1.5"
              >
                {currentRange.label}
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {rangeOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setRangeOpen(false)} />
                  <div className="absolute right-0 top-10 z-30 w-44 bg-white border border-border rounded-md shadow-lg py-1">
                    {RANGES.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => { setRange(r.id); setRangeOpen(false); }}
                        className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-black/5 ${r.id === range ? "font-semibold text-gold" : ""}`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button
              onClick={exportReport}
              className="h-9 px-3 rounded-md bg-ink text-white text-[12px] font-semibold hover:bg-ink/90"
            >
              Export report
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI to="/transactions" label="Revenue" value={naira(kpis.revenue.value)}
          delta={formatDelta(kpis.revenue.delta)} positive={kpis.revenue.delta >= 0}
          icon={TrendingUp} spark={revenueSpark} />
        <KPI to="/orders" label="Orders" value={String(kpis.orders.value)}
          delta={formatDelta(kpis.orders.delta)} positive={kpis.orders.delta >= 0}
          icon={ShoppingBag} spark={ordersSpark} />
        <KPI to="/orders" label="Avg Order Value" value={naira(kpis.aov.value)}
          delta={formatDelta(kpis.aov.delta)} positive={kpis.aov.delta >= 0}
          icon={Package} spark={revenueSpark} />
        <KPI to="/returns" label="Refund Rate" value={`${(kpis.refundRate.value * 100).toFixed(1)}%`}
          delta={formatDelta(kpis.refundRate.delta, true)} positive={kpis.refundRate.delta <= 0}
          icon={RotateCcw} spark={ordersSpark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-bold text-[16px]">Revenue by day</h2>
              <p className="text-[11px] text-muted-foreground">Store-wide, all channels</p>
            </div>
            <span className="text-[11px] text-muted-foreground">₦ thousands</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueByDay} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#CC5000" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#CC5000" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#E7E2D8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#E7E2D8" />
                <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} stroke="#E7E2D8"
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E7E2D8" }}
                  formatter={(v: number) => naira(v)}
                />
                <Area type="monotone" dataKey="revenue" stroke="#CC5000" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-border rounded-lg p-5">
          <h2 className="font-display font-bold text-[16px] mb-4">Orders by status</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {statusData.map((s) => (
                    <Cell key={s.key} fill={STATUS_COLORS[s.name] || STATUS_COLORS[s.key] || "#71717A"} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E7E2D8" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {statusData.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[s.name] || STATUS_COLORS[s.key] || "#71717A" }} />
                  {s.name}
                </span>
                <span className="tabular-nums font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-border rounded-lg p-5">
          <h2 className="font-display font-bold text-[16px] mb-4">Top categories</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topCategories} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <CartesianGrid stroke="#E7E2D8" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6b7280" }}
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`} stroke="#E7E2D8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#0B0B0B" }}
                  width={90} stroke="#E7E2D8" />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #E7E2D8" }}
                  formatter={(v: number) => naira(v)} />
                <Bar dataKey="revenue" fill="#0B0B0B" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border border-border rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-[16px]">Concierge funnel</h2>
            <span className="text-[11px] text-muted-foreground">Last {currentRange.days}d · {concierge.open} open</span>
          </div>
          <div className="space-y-2">
            {(conciergeFunnel.length ? conciergeFunnel : [{ stage: "No data", n: 0 }]).map((s, i, arr) => {
              const max = Math.max(arr[0]?.n || 1, 1);
              const pct = Math.max(8, (s.n / max) * 100);
              return (
                <div key={s.stage} className="flex items-center gap-3">
                  <div className="w-24 text-[12px] text-muted-foreground">{s.stage}</div>
                  <div className="flex-1 h-8 bg-[#f7f5ef] rounded-md overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-gold/70 to-gold rounded-md flex items-center justify-end pr-3 text-white text-[11px] font-bold"
                      style={{ width: `${pct}%` }}
                    >
                      {s.n}
                    </div>
                  </div>
                  {i > 0 && arr[i - 1].n > 0 && (
                    <div className="w-14 text-right text-[11px] text-muted-foreground tabular-nums">
                      {((s.n / arr[i - 1].n) * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-display font-bold text-[16px]">Recent orders</h2>
            <Link to="/orders" className="text-[11px] font-semibold text-gold hover:underline">All orders →</Link>
          </div>
          <table className="w-full text-[12.5px]">
            <thead className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground bg-[#faf8f3]">
              <tr>
                <th className="text-left px-5 py-2 font-semibold">Order</th>
                <th className="text-left px-5 py-2 font-semibold">Date</th>
                <th className="text-left px-5 py-2 font-semibold">Status</th>
                <th className="text-right px-5 py-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 8).map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-[#faf8f3] cursor-pointer group">
                  <td className="px-5 py-2.5 font-sans text-[11.5px]">
                    <Link to="/orders/$id" params={{ id: o.id }} className="text-ink group-hover:text-gold">
                      {o.number || o.id}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-muted-foreground">
                    <Link to="/orders/$id" params={{ id: o.id }} className="block">
                      {new Date(o.placedAt).toLocaleDateString()}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="inline-flex px-2 h-5 items-center rounded-full text-[10px] font-bold"
                      style={{
                        background: (STATUS_COLORS[o.statusLabel] || STATUS_COLORS[o.status] || "#71717A") + "22",
                        color: STATUS_COLORS[o.statusLabel] || STATUS_COLORS[o.status] || "#71717A",
                      }}>
                      {o.statusLabel || o.status}
                    </span>
                  </td>
                  <td className="px-5 py-2.5 text-right font-semibold tabular-nums">
                    <Link to="/orders/$id" params={{ id: o.id }} className="block">{naira(o.total)}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-3">
            <h2 className="font-display font-bold text-[16px]">Activity</h2>
            <Link to="/activity" className="text-[11px] font-semibold text-gold hover:underline">All →</Link>
          </div>
          <div className="divide-y divide-border">
            {activity.map((a) => {
              const meta = ACT_META[a.type] ?? ACT_META.system;
              const Icon = meta.icon;
              const href = a.link || ACT_LINK[a.type as ActivityType] || "/activity";
              return (
                <Link key={a.id} to={href} className="px-5 py-3 flex items-start gap-3 hover:bg-[#faf8f3] transition-colors">
                  <div className={`h-7 w-7 rounded-full grid place-items-center shrink-0 ${meta.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-medium leading-snug truncate">{a.title}</div>
                    {a.meta && <div className="text-[11px] text-muted-foreground truncate">{a.meta}</div>}
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0 pt-0.5">{timeAgo(a.at)}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
