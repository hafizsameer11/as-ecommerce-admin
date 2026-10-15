import { useEffect, useMemo } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap, naira } from "./ui";
import {
  useConciergeAnalytics, PRIORITY_LABEL,
  type Range, type Priority,
} from "@/lib/analytics-concierge-store";
import { formatKpiDelta, kpiDeltaFraction } from "@/lib/analytics-kpi";
import { downloadCSV } from "@/lib/admin-export";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Line, LineChart, ComposedChart,
} from "recharts";
import {
  MessageSquare, CheckCircle2, Clock, Percent, Download,
  ArrowUpRight, ArrowDownRight, Sparkles, Users,
} from "lucide-react";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months",
};

const CAT_COLORS = ["#0f0f0f", "#b8935a", "#4b6cb7", "#8b5cf6", "#059669"];

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function AdminAnalyticsConcierge() {
  const {
    range, priority, setRange, setPriority, hydrate,
    series, stages, categories, agents, suppliers, reasons,
    totalRequests, totalQuotes, totalConverted, gmv, aov, conversion, slaPct,
    firstResponseMin, avgQuoteHours, avgFulfillmentDays, openTickets, kpis, slaTargets,
  } = useConciergeAnalytics();

  useEffect(() => {
    void hydrate({ range, priority });
  }, [range, priority, hydrate]);

  const data = useMemo(
    () => ({
      series, stages, categories, agents, suppliers, reasons,
      totalRequests, totalQuotes, totalConverted, gmv, aov, conversion, slaPct,
      firstResponseMin, avgQuoteHours, avgFulfillmentDays, openTickets,
    }),
    [series, stages, categories, agents, suppliers, reasons,
      totalRequests, totalQuotes, totalConverted, gmv, aov, conversion, slaPct,
      firstResponseMin, avgQuoteHours, avgFulfillmentDays, openTickets],
  );

  const exportRows = () => {
    downloadCSV(
      `concierge-analytics-${range}-${Date.now()}.csv`,
      data.series.map((p) => ({
        date: p.date,
        requests: p.requests,
        quotes: p.quotes,
        converted: p.converted,
        sla_pct: (p.sla * 100).toFixed(1),
      })),
    );
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Concierge analytics"
        subtitle="Request volume, SLA adherence, conversion and team performance across concierge operations."
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
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All tiers</option>
          {(Object.keys(PRIORITY_LABEL) as (keyof typeof PRIORITY_LABEL)[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
        <div className="ml-auto text-[12px] text-muted-foreground">
          {RANGE_LABEL[range]} · {data.openTickets} open tickets
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Requests" value={data.totalRequests.toLocaleString()} delta={kpiDeltaFraction(kpis.requests ?? kpis.totalRequests)} icon={<MessageSquare className="h-4 w-4" />} />
        <KPI label="Converted" value={data.totalConverted.toLocaleString()} delta={kpiDeltaFraction(kpis.converted ?? kpis.totalConverted)} icon={<CheckCircle2 className="h-4 w-4" />} />
        <KPI label="Conversion rate" value={`${(data.conversion * 100).toFixed(1)}%`} delta={kpiDeltaFraction(kpis.conversion)} icon={<Percent className="h-4 w-4" />} />
        <KPI label="Concierge GMV" value={naira(Math.round(data.gmv))} delta={kpiDeltaFraction(kpis.gmv)} icon={<Sparkles className="h-4 w-4" />} />
      </div>

      {/* Ops SLA row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard
          label="First response"
          value={`${data.firstResponseMin} min`}
          sub={slaTargets?.firstResponseMin != null ? `Target ≤ ${slaTargets.firstResponseMin} min` : "vs prior period"}
          ok={slaTargets?.firstResponseMin != null ? data.firstResponseMin <= slaTargets.firstResponseMin : undefined}
        />
        <StatCard
          label="Avg. quote time"
          value={`${data.avgQuoteHours.toFixed(1)} hrs`}
          sub={slaTargets?.avgQuoteHours != null ? `Target ≤ ${slaTargets.avgQuoteHours} hrs` : "vs prior period"}
          ok={slaTargets?.avgQuoteHours != null ? data.avgQuoteHours <= slaTargets.avgQuoteHours : undefined}
        />
        <StatCard
          label="Avg. fulfilment"
          value={`${data.avgFulfillmentDays.toFixed(1)} days`}
          sub={slaTargets?.avgFulfillmentDays != null ? `Target ≤ ${slaTargets.avgFulfillmentDays} days` : "vs prior period"}
          ok={slaTargets?.avgFulfillmentDays != null ? data.avgFulfillmentDays <= slaTargets.avgFulfillmentDays : undefined}
        />
        <StatCard
          label="SLA adherence"
          value={`${(data.slaPct * 100).toFixed(1)}%`}
          sub={slaTargets?.slaPct != null ? `Target ≥ ${(slaTargets.slaPct * 100).toFixed(0)}%` : "vs prior period"}
          ok={slaTargets?.slaPct != null ? data.slaPct >= slaTargets.slaPct : undefined}
        />
      </div>

      {/* Requests over time */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Requests & conversion</div>
            <div className="font-display font-semibold text-lg">{data.totalRequests.toLocaleString()} requests</div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <LegendDot color="#0f0f0f" label="Requests" />
            <LegendDot color="#b8935a" label="Quoted" />
            <LegendDot color="#059669" label="Converted" />
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data.series} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="creq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f0f0f" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#0f0f0f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="cqte" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b8935a" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#b8935a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                labelFormatter={(l) => shortDate(l as string)}
                formatter={(v: number, n) => {
                  const label = n === "requests" ? "Requests" : n === "quotes" ? "Quoted" : "Converted";
                  return [v.toLocaleString(), label];
                }}
              />
              <Area type="monotone" dataKey="requests" stroke="#0f0f0f" strokeWidth={2} fill="url(#creq)" />
              <Area type="monotone" dataKey="quotes" stroke="#b8935a" strokeWidth={2} fill="url(#cqte)" />
              <Line type="monotone" dataKey="converted" stroke="#059669" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Pipeline + Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Request pipeline</div>
          <div className="font-display font-semibold text-lg mb-3">Stage funnel</div>
          <div className="space-y-2">
            {data.stages.map((s, i) => {
              const share = s.count / data.stages[0].count;
              const drop = i > 0 ? 1 - s.count / data.stages[i - 1].count : 0;
              return (
                <div key={s.stage}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <div className="text-ink">{s.stage}</div>
                    <div className="text-muted-foreground tabular-nums">
                      {s.count.toLocaleString()} · {(share * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="h-6 rounded-md bg-black/[0.04] overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-ink to-gold/70" style={{ width: `${share * 100}%` }} />
                  </div>
                  {i > 0 && drop > 0 && (
                    <div className="text-[11px] text-rose-600 mt-0.5"> - {(drop * 100).toFixed(1)}% drop-off</div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">By category</div>
              <div className="font-display font-semibold text-lg">Requests vs converted</div>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <ComposedChart data={data.categories} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                  formatter={(v: number, n) => [v.toLocaleString(), n === "requests" ? "Requests" : "Converted"]}
                />
                <Bar dataKey="requests" fill="#0f0f0f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="converted" fill="#b8935a" radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Agents table + lost-reason donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card padded={false} className="lg:col-span-2">
          <div className="px-5 py-4 flex items-center justify-between">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Agent leaderboard</div>
              <div className="font-display font-semibold text-lg">Concierge team performance</div>
            </div>
            <Chip tone="neutral"><Users className="h-3 w-3" /> {data.agents.length}</Chip>
          </div>
          <TableWrap>
            <table className="w-full text-[13px]">
              <thead className="bg-black/[0.02] text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Agent</th>
                  <th className="px-4 py-2.5 font-medium text-right">Handled</th>
                  <th className="px-4 py-2.5 font-medium text-right">Conv.</th>
                  <th className="px-4 py-2.5 font-medium text-right">CSAT</th>
                  <th className="px-4 py-2.5 font-medium text-right">First resp.</th>
                  <th className="px-4 py-2.5 font-medium text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {data.agents.map((a) => (
                  <tr key={a.id} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-ink">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.id}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-sans">{a.handled}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={a.conv >= 0.45 ? "text-ink" : "text-muted-foreground"}>
                        {(a.conv * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{a.csat.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={a.firstResponseMin <= 10 ? "text-ink" : "text-amber-700"}>
                        {a.firstResponseMin}m
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-sans text-ink">{naira(a.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Lost reasons</div>
          <div className="font-display font-semibold text-lg mb-3">Why deals stall</div>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.reasons} dataKey="pct" nameKey="reason" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.reasons.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, p) => [`${(v * 100).toFixed(1)}%`, (p as { payload: { reason: string } }).payload.reason]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.reasons.map((r, i) => (
              <div key={r.reason} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: CAT_COLORS[i % CAT_COLORS.length] }} />
                  <span className="text-ink">{r.reason}</span>
                </div>
                <div className="text-muted-foreground tabular-nums">{(r.pct * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Suppliers */}
      <Card padded={false}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Supplier scorecard</div>
            <div className="font-display font-semibold text-lg">Sourcing partners</div>
          </div>
          <Chip tone="neutral">{data.suppliers.length} partners</Chip>
        </div>
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Supplier</th>
                <th className="px-4 py-2.5 font-medium text-right">Fulfilled</th>
                <th className="px-4 py-2.5 font-medium text-right">On-time</th>
                <th className="px-4 py-2.5 font-medium text-right">Defect rate</th>
                <th className="px-4 py-2.5 font-medium text-right">Avg. margin</th>
                <th className="px-4 py-2.5 font-medium text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.suppliers.map((s) => {
                const rating = s.onTime * 0.5 + (1 - s.defectRate * 10) * 0.3 + s.avgMargin * 0.5;
                const tone: "green" | "amber" | "red" = rating >= 0.85 ? "green" : rating >= 0.7 ? "amber" : "red";
                return (
                  <tr key={s.name} className="hover:bg-black/[0.02]">
                    <td className="px-4 py-3 text-ink">{s.name}</td>
                    <td className="px-4 py-3 text-right font-sans">{s.fulfilled}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={s.onTime >= 0.9 ? "text-ink" : "text-amber-700"}>
                        {(s.onTime * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={s.defectRate <= 0.02 ? "text-ink" : "text-rose-600"}>
                        {(s.defectRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{(s.avgMargin * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right">
                      <Chip tone={tone}>{rating >= 0.85 ? "Excellent" : rating >= 0.7 ? "Good" : "Needs review"}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}

function KPI({ label, value, delta, icon }: { label: string; value: string; delta: number | null; icon?: React.ReactNode }) {
  const up = delta != null ? delta >= 0 : true;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="font-display text-[22px] font-bold mt-1">{value}</div>
      <div className={`text-[12px] inline-flex items-center gap-1 mt-1 ${delta == null ? "text-muted-foreground" : up ? "text-ink" : "text-rose-700"}`}>
        {delta != null && (up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />)}
        {formatKpiDelta(delta)}
      </div>
    </Card>
  );
}

function StatCard({ label, value, sub, ok }: { label: string; value: string; sub: string; ok?: boolean }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <Clock className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="font-display text-[20px] font-bold mt-1">{value}</div>
      <div className={`text-[11px] mt-0.5 ${ok === undefined ? "text-muted-foreground" : ok ? "text-ink" : "text-rose-700"}`}>
        {ok === undefined ? sub : `${ok ? "On target · " : "Off target · "}${sub}`}
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </div>
  );
}
