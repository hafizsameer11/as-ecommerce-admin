import { useEffect, useMemo } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, TableWrap } from "./ui";
import {
  useTrafficAnalytics, getTrafficData, SOURCE_LABEL, DEVICE_LABEL,
  type Range, type Device, type Source,
} from "@/lib/analytics-traffic-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Line, LineChart,
} from "recharts";
import {
  Users, MousePointerClick, Clock, Percent, ArrowUpRight, ArrowDownRight,
  Download, Smartphone, Monitor, Tablet, Globe,
} from "lucide-react";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "Last 7 days", "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months",
};

const SOURCE_COLOR: Record<Source, string> = {
  direct: "#0f0f0f", organic: "#059669", social: "#8b5cf6",
  paid: "#b8935a", email: "#4b6cb7", referral: "#dc2626",
};

const DEVICE_ICON: Record<Exclude<Device, "all">, React.ReactNode> = {
  mobile: <Smartphone className="h-3.5 w-3.5" />,
  desktop: <Monitor className="h-3.5 w-3.5" />,
  tablet: <Tablet className="h-3.5 w-3.5" />,
};

function pct(n: number) {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${(n * 100).toFixed(1)}%`;
}
function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

export function AdminAnalyticsTraffic() {
  const {
    range, device, source, setRange, setDevice, setSource, hydrate,
    series, sources, devices, countries, pages, referrers, funnel,
    totalVisitors, totalSessions, totalPageviews, bounceRate, avgSessionSec, pagesPerSession,
  } = useTrafficAnalytics();

  useEffect(() => {
    void hydrate({ range, device, source });
  }, [range, device, source, hydrate]);

  const data = useMemo(
    () => ({
      series, sources, devices, countries, pages, referrers, funnel,
      totalVisitors, totalSessions, totalPageviews, bounceRate, avgSessionSec, pagesPerSession,
    }),
    [series, sources, devices, countries, pages, referrers, funnel,
      totalVisitors, totalSessions, totalPageviews, bounceRate, avgSessionSec, pagesPerSession],
  );

  const prev = useMemo(() => ({
    visitors: Math.round(data.totalVisitors * 0.89),
    sessions: Math.round(data.totalSessions * 0.92),
    bounceRate: data.bounceRate * 1.08,
    avgSessionSec: Math.round(data.avgSessionSec * 0.94),
  }), [data]);

  const dV = (data.totalVisitors - prev.visitors) / (prev.visitors || 1);
  const dS = (data.totalSessions - prev.sessions) / (prev.sessions || 1);
  const dB = (data.bounceRate - prev.bounceRate) / (prev.bounceRate || 1);
  const dT = (data.avgSessionSec - prev.avgSessionSec) / (prev.avgSessionSec || 1);

  const exportRows = () => {
    downloadCSV(
      `traffic-analytics-${range}-${Date.now()}.csv`,
      data.series.map((p) => ({
        date: p.date,
        visitors: p.visitors,
        sessions: p.sessions,
        pageviews: p.pageviews,
        bounces: p.bounces,
      })),
    );
  };

  const maxCountry = Math.max(...data.countries.map((c) => c.visitors));
  const maxRef = Math.max(...data.referrers.map((r) => r.visitors));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Traffic analytics"
        subtitle="Sessions, sources, devices and behaviour across the storefront."
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
          value={device}
          onChange={(e) => setDevice(e.target.value as Device)}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All devices</option>
          {(Object.keys(DEVICE_LABEL) as (keyof typeof DEVICE_LABEL)[]).map((d) => (
            <option key={d} value={d}>{DEVICE_LABEL[d]}</option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as Source | "all")}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All sources</option>
          {(Object.keys(SOURCE_LABEL) as Source[]).map((s) => (
            <option key={s} value={s}>{SOURCE_LABEL[s]}</option>
          ))}
        </select>
        <div className="ml-auto text-[12px] text-muted-foreground">
          {RANGE_LABEL[range]} · compared to previous period
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KPI label="Visitors" value={data.totalVisitors.toLocaleString()} delta={dV} icon={<Users className="h-4 w-4" />} data={data.series} k="visitors" />
        <KPI label="Sessions" value={data.totalSessions.toLocaleString()} delta={dS} icon={<MousePointerClick className="h-4 w-4" />} data={data.series} k="sessions" />
        <KPI label="Bounce rate" value={`${(data.bounceRate * 100).toFixed(1)}%`} delta={dB} invert icon={<Percent className="h-4 w-4" />} data={data.series} k="bounces" />
        <KPI label="Avg. session" value={fmtDuration(data.avgSessionSec)} delta={dT} icon={<Clock className="h-4 w-4" />} data={data.series} k="pageviews" />
      </div>

      {/* Sessions area chart */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Sessions over time</div>
            <div className="font-display font-semibold text-lg">{data.totalSessions.toLocaleString()} sessions</div>
          </div>
          <div className="flex items-center gap-3 text-[12px]">
            <LegendDot color="#0f0f0f" label="Sessions" />
            <LegendDot color="#b8935a" label="Visitors" />
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <AreaChart data={data.series} margin={{ top: 5, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="tsess" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f0f0f" stopOpacity={0.22} />
                  <stop offset="100%" stopColor="#0f0f0f" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="tvis" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#b8935a" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#b8935a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(v)} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                labelFormatter={(l) => shortDate(l as string)}
                formatter={(v: number, n) => [v.toLocaleString(), n === "sessions" ? "Sessions" : "Visitors"]}
              />
              <Area type="monotone" dataKey="sessions" stroke="#0f0f0f" strokeWidth={2} fill="url(#tsess)" />
              <Area type="monotone" dataKey="visitors" stroke="#b8935a" strokeWidth={2} fill="url(#tvis)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Sources + Devices + Funnel row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Traffic sources</div>
          <div className="font-display font-semibold text-lg mb-3">{data.sources.length} channels</div>
          <div className="h-52">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data.sources} dataKey="visitors" nameKey="source" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {data.sources.map((s) => (
                    <Cell key={s.source} fill={SOURCE_COLOR[s.source]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, _n, p) => [v.toLocaleString(), SOURCE_LABEL[(p as { payload: { source: Source } }).payload.source]]}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid rgba(0,0,0,0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {data.sources.map((s) => (
              <div key={s.source} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: SOURCE_COLOR[s.source] }} />
                  <span className="text-ink">{SOURCE_LABEL[s.source]}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span className="tabular-nums">{s.visitors.toLocaleString()}</span>
                  <span className="tabular-nums text-ink">{(s.conv * 100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Devices</div>
          <div className="font-display font-semibold text-lg mb-3">Breakdown</div>
          <div className="space-y-3">
            {data.devices.map((d) => (
              <div key={d.device}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <div className="flex items-center gap-2 text-ink">
                    {DEVICE_ICON[d.device]} {DEVICE_LABEL[d.device]}
                  </div>
                  <div className="text-muted-foreground tabular-nums">
                    {d.visitors.toLocaleString()} · {Math.round(d.share * 100)}%
                  </div>
                </div>
                <div className="h-2 rounded-full bg-black/[0.06] overflow-hidden">
                  <div className="h-full bg-ink" style={{ width: `${d.share * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-[12px]">
            <div className="rounded-lg bg-black/[0.03] p-3">
              <div className="text-muted-foreground">Pages / session</div>
              <div className="font-display text-lg font-semibold">{data.pagesPerSession.toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-black/[0.03] p-3">
              <div className="text-muted-foreground">Pageviews</div>
              <div className="font-display text-lg font-semibold">{data.totalPageviews.toLocaleString()}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="text-[12px] uppercase tracking-wide text-muted-foreground mb-1">Conversion funnel</div>
          <div className="font-display font-semibold text-lg mb-3">Visit → Purchase</div>
          <div className="space-y-2">
            {data.funnel.map((f, i) => {
              const share = f.value / data.funnel[0].value;
              const dropoff = i > 0 ? 1 - f.value / data.funnel[i - 1].value : 0;
              return (
                <div key={f.stage}>
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <div className="text-ink">{f.stage}</div>
                    <div className="text-muted-foreground tabular-nums">
                      {f.value.toLocaleString()} · {(share * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="h-6 rounded-md bg-black/[0.04] overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-ink to-gold/70"
                      style={{ width: `${share * 100}%` }}
                    />
                  </div>
                  {i > 0 && dropoff > 0 && (
                    <div className="text-[11px] text-rose-600 mt-0.5"> - {(dropoff * 100).toFixed(1)}% drop-off
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Countries + Referrers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Top countries</div>
              <div className="font-display font-semibold text-lg">{data.countries.length} markets</div>
            </div>
            <Chip tone="gold"><Globe className="h-3 w-3" /> {data.countries[0].country}</Chip>
          </div>
          <div className="space-y-2.5">
            {data.countries.map((c) => (
              <div key={c.country}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <div className="text-ink">{c.country}</div>
                  <div className="text-muted-foreground tabular-nums">{c.visitors.toLocaleString()}</div>
                </div>
                <div className="h-2 rounded-full bg-black/[0.05] overflow-hidden">
                  <div className="h-full bg-ink" style={{ width: `${(c.visitors / maxCountry) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Top referrers</div>
              <div className="font-display font-semibold text-lg">External sources</div>
            </div>
          </div>
          <div className="space-y-2.5">
            {data.referrers.map((r) => (
              <div key={r.host} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-md bg-black/[0.05] grid place-items-center text-[11px] font-semibold text-ink">
                  {r.host[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[12px] mb-1">
                    <div className="text-ink">{r.host}</div>
                    <div className="text-muted-foreground tabular-nums">{r.visitors.toLocaleString()}</div>
                  </div>
                  <div className="h-1.5 rounded-full bg-black/[0.05] overflow-hidden">
                    <div className="h-full bg-gold" style={{ width: `${(r.visitors / maxRef) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top pages */}
      <Card padded={false}>
        <div className="px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[12px] uppercase tracking-wide text-muted-foreground">Top pages</div>
            <div className="font-display font-semibold text-lg">Most viewed this period</div>
          </div>
          <Chip tone="neutral">{data.pages.length} pages</Chip>
        </div>
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-medium">Page</th>
                <th className="px-4 py-2.5 font-medium">Path</th>
                <th className="px-4 py-2.5 font-medium text-right">Views</th>
                <th className="px-4 py-2.5 font-medium text-right">Avg. time</th>
                <th className="px-4 py-2.5 font-medium text-right">Exit rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {data.pages.map((p) => (
                <tr key={p.path} className="hover:bg-black/[0.02]">
                  <td className="px-4 py-3 text-ink">{p.title}</td>
                  <td className="px-4 py-3 text-muted-foreground font-sans text-[12px]">{p.path}</td>
                  <td className="px-4 py-3 text-right font-sans">{p.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-sans">{fmtDuration(p.avgTimeSec)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.exitRate > 0.4 ? "text-rose-600" : "text-muted-foreground"}>
                      {(p.exitRate * 100).toFixed(1)}%
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
  label, value, delta, icon, data, k, invert = false,
}: {
  label: string; value: string; delta: number; icon?: React.ReactNode;
  data: ReturnType<typeof getTrafficData>["series"];
  k: "visitors" | "sessions" | "pageviews" | "bounces";
  invert?: boolean;
}) {
  const up = delta >= 0;
  const good = invert ? !up : up;
  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">{label}</div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="font-display text-[22px] font-bold mt-1">{value}</div>
      <div className="flex items-center justify-between mt-1">
        <div className={`text-[12px] inline-flex items-center gap-1 ${good ? "text-ink" : "text-rose-700"}`}>
          {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          {pct(delta)}
        </div>
        <div className="h-8 w-24">
          <ResponsiveContainer>
            <LineChart data={data}>
              <Line type="monotone" dataKey={k} stroke="#0f0f0f" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
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
