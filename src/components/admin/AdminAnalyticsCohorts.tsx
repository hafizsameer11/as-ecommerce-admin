import { useEffect, useMemo } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import {
  useCohortAnalytics,
  type Window, type Metric,
} from "@/lib/analytics-cohorts-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  Users, Repeat, TrendingUp, Download, ArrowUpRight, ArrowDownRight, Sparkles,
} from "lucide-react";

const WINDOW_LABEL: Record<Window, string> = {
  "6m": "6 months", "12m": "12 months", "24m": "24 months",
};

const METRIC_LABEL: Record<Metric, string> = {
  retention: "Retention %", revenue: "Revenue", orders: "Orders",
};

function heatColor(v: number, metric: Metric, max: number) {
  if (metric === "retention") {
    // v in 0..1
    const t = Math.min(1, Math.max(0, v));
    const alpha = 0.08 + t * 0.85;
    return `rgba(184, 147, 90, ${alpha})`;
  }
  const t = Math.min(1, v / (max || 1));
  const alpha = 0.08 + t * 0.85;
  return `rgba(15, 15, 15, ${alpha})`;
}

function formatCell(v: number | null, metric: Metric) {
  if (v === null || v === undefined) return "";
  if (metric === "retention") return `${(v * 100).toFixed(0)}%`;
  if (metric === "orders") return v.toLocaleString();
  return `₦${(v / 1_000_000).toFixed(1)}M`;
}

export function AdminAnalyticsCohorts() {
  const {
    window, metric, setWindow, setMetric, hydrate,
    cohorts, curve, ltv, segments, totalNew, m1, m3, m6, m12, size,
  } = useCohortAnalytics();

  useEffect(() => {
    void hydrate({ window, metric });
  }, [window, metric, hydrate]);

  const data = useMemo(
    () => ({ cohorts, curve, ltv, segments, totalNew, m1, m3, m6, m12, size }),
    [cohorts, curve, ltv, segments, totalNew, m1, m3, m6, m12, size],
  );

  const maxCell = useMemo(() => {
    if (metric === "retention") return 1;
    let m = 0;
    for (const c of data.cohorts) for (const v of c.row) if (v && v > m) m = v;
    return m;
  }, [data, metric]);

  const exportRows = () => {
    downloadCSV(
      `cohorts-${metric}-${window}-${Date.now()}.csv`,
      data.cohorts.map((c) => ({
        cohort: c.label,
        new_customers: c.newCustomers,
        ...Object.fromEntries(c.row.map((v, i) => [`m${i}`, v ?? ""])),
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Cohort analytics"
        subtitle="Retention curves, repeat purchase behaviour, LTV and segment analytics for the ASL customer base."
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
          {(Object.keys(WINDOW_LABEL) as Window[]).map((w) => (
            <button
              key={w}
              onClick={() => setWindow(w)}
              className={`px-3 h-9 text-[12px] ${window === w ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"}`}
            >
              {w.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-md border border-black/10 bg-white overflow-hidden">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 h-9 text-[12px] ${metric === m ? "bg-ink text-white" : "text-ink hover:bg-black/[0.04]"}`}
            >
              {METRIC_LABEL[m]}
            </button>
          ))}
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">
          {WINDOW_LABEL[window]} · {data.totalNew.toLocaleString()} customers acquired
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="New customers" value={data.totalNew.toLocaleString()} delta={0.11} icon={<Users className="h-4 w-4" />} />
        <KPI label="M1 retention" value={`${(data.m1 * 100).toFixed(0)}%`} delta={0.03} icon={<Repeat className="h-4 w-4" />} />
        <KPI label="M6 retention" value={`${(data.m6 * 100).toFixed(0)}%`} delta={-0.008} invert icon={<TrendingUp className="h-4 w-4" />} />
        <KPI
          label="Avg. LTV"
          value={naira(data.ltv[data.ltv.length - 1]?.ltv ?? 0)}
          delta={0.16}
          icon={<Sparkles className="h-4 w-4" />}
        />
      </div>

      {/* retention curve */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Average curve</div>
              <div className="font-display font-semibold text-lg">{METRIC_LABEL[metric]} by month since acquisition</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={data.curve} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="curve" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b8935a" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#b8935a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `M${v}`}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => metric === "retention" ? `${Math.round(v * 100)}%` : v.toFixed(2)}
                />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  labelFormatter={(l) => `Month ${l}`}
                  formatter={(v: number) => [metric === "retention" ? `${(v * 100).toFixed(1)}%` : v.toFixed(2), METRIC_LABEL[metric]]}
                />
                <Area type="monotone" dataKey="value" stroke="#b8935a" strokeWidth={2} fill="url(#curve)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-[12px]">
            <MilestoneCell label="Month 1" value={data.m1} />
            <MilestoneCell label="Month 3" value={data.m3} />
            <MilestoneCell label="Month 6" value={data.m6} />
            <MilestoneCell label="Month 12" value={data.m12} />
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Cumulative LTV</div>
          <div className="font-display font-semibold text-lg mb-3">Per customer</div>
          <div className="h-52">
            <ResponsiveContainer>
              <LineChart data={data.ltv} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `M${v}`} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => `₦${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  labelFormatter={(l) => `Month ${l}`}
                  formatter={(v: number) => [naira(v), "LTV"]}
                />
                <Line type="monotone" dataKey="ltv" stroke="#0f0f0f" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            <LtvRow label="30-day LTV" value={data.ltv[1]?.ltv ?? 0} />
            <LtvRow label="90-day LTV" value={data.ltv[3]?.ltv ?? 0} />
            <LtvRow label="12-month LTV" value={data.ltv[Math.min(12, data.ltv.length - 1)]?.ltv ?? 0} bold />
          </div>
        </Card>
      </div>

      {/* heatmap */}
      <Card padded={false} className="mb-5">
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Cohort heatmap</div>
            <div className="font-display font-semibold text-lg">{METRIC_LABEL[metric]} by acquisition month</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span>Low</span>
            <div className="h-2 w-24 rounded-full" style={{ background: metric === "retention"
              ? "linear-gradient(to right, rgba(184,147,90,0.1), rgba(184,147,90,0.9))"
              : "linear-gradient(to right, rgba(15,15,15,0.1), rgba(15,15,15,0.9))" }} />
            <span>High</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead className="bg-black/[0.02] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium sticky left-0 bg-black/[0.02] z-10">Cohort</th>
                <th className="px-3 py-2 text-right font-medium">New</th>
                {Array.from({ length: data.size }).map((_, i) => (
                  <th key={i} className="px-2 py-2 text-center font-medium">M{i}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.cohorts.map((c) => (
                <tr key={c.label}>
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-black/[0.06]">
                    <div className="text-ink font-medium">{c.label}</div>
                  </td>
                  <td className="px-3 py-2 text-right font-sans text-muted-foreground">{c.newCustomers}</td>
                  {c.row.map((v, i) => (
                    <td key={i} className="px-1 py-1">
                      {v !== null && v !== undefined ? (
                        <div
                          className="h-8 min-w-[46px] rounded-md grid place-items-center font-sans tabular-nums text-ink"
                          style={{ background: heatColor(v, metric, maxCell) }}
                        >
                          <span className={metric === "retention" && v > 0.55 ? "text-white" : ""}>
                            {formatCell(v, metric)}
                          </span>
                        </div>
                      ) : (
                        <div className="h-8 min-w-[46px] rounded-md bg-black/[0.02]" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* segments */}
      <Card padded={false}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Customer segments</div>
            <div className="font-display font-semibold text-lg">Retention & LTV by segment</div>
          </div>
          <Chip tone="neutral">{data.segments.length} segments</Chip>
        </div>
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Segment</th>
                <th className="px-4 py-2.5 font-medium text-right">Size</th>
                <th className="px-4 py-2.5 font-medium text-right">12-mo retention</th>
                <th className="px-4 py-2.5 font-medium text-right">Avg. LTV</th>
                <th className="px-4 py-2.5 font-medium text-right">Segment revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.segments.map((s) => (
                <tr key={s.name} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-right font-sans">{s.size.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={s.retention >= 0.5 ? "text-ink" : "text-muted-foreground"}>
                      {(s.retention * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-sans">{naira(s.ltv)}</td>
                  <td className="px-4 py-3 text-right font-sans text-ink">{naira(s.size * s.ltv)}</td>
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
}: { label: string; value: string; delta: number; icon?: React.ReactNode; invert?: boolean }) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="font-display text-[22px] font-bold mt-1">{value}</div>
      <div className={`text-[12px] inline-flex items-center gap-1 mt-1 ${good ? "text-ink" : "text-rose-700"}`}>
        {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
        {up ? "+" : ""}{(delta * 100).toFixed(1)}%
      </div>
    </Card>
  );
}

function MilestoneCell({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-black/[0.03] p-2.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-display text-[16px] font-semibold">{(value * 100).toFixed(0)}%</div>
    </div>
  );
}

function LtvRow({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-[12px] ${bold ? "font-medium text-ink" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span className="font-sans tabular-nums">{naira(value)}</span>
    </div>
  );
}
