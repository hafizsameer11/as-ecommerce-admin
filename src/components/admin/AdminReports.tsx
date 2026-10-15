import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, TableWrap, Toolbar, naira } from "./ui";
import {
  useReports, CATEGORY_META, STATUS_META,
  type SavedReport, type ReportCategory, type ReportFormat,
} from "@/lib/reports-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  BarChart3, Star, Play, Calendar, Search, Plus, Download, X, Trash2,
  Clock, CheckCircle2, AlertTriangle, Mail, FileSpreadsheet, FileText,
  Save, RefreshCw, Users, Package, Sparkles, Truck, Receipt, Landmark, LineChart,
} from "lucide-react";

type Tab = "library" | "runs" | "scheduled";

const CATEGORY_ICON: Record<ReportCategory, typeof BarChart3> = {
  sales: LineChart,
  finance: Landmark,
  customers: Users,
  catalog: Package,
  concierge: Sparkles,
  operations: Truck,
  tax: Receipt,
};

const FORMAT_ICON: Record<ReportFormat, typeof FileText> = {
  csv: FileText,
  xlsx: FileSpreadsheet,
  pdf: FileText,
};

function fmtDateTime(ts?: number) {
  if (!ts) return " - ";
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(ts?: number) {
  if (!ts) return " - ";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function duration(ms?: number) {
  if (!ms) return " - ";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  return `${(s / 60).toFixed(1)}m`;
}

export function AdminReports() {
  const {
    reports, runs, addReport, updateReport, removeReport, toggleFavorite, runReport, markRunFinished, hydrate,
  } = useReports();

  const [tab, setTab] = useState<Tab>("library");
  const [q, setQ] = useState("");

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const [category, setCategory] = useState<ReportCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return reports.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!query) return true;
      return [r.name, r.description, r.owner, r.id].some((v) => v.toLowerCase().includes(query));
    });
  }, [reports, q, category]);

  const scheduled = useMemo(() => reports.filter((r) => r.schedule && r.schedule !== "off"), [reports]);

  const kpis = useMemo(() => {
    const day = 86400000;
    const runsToday = runs.filter((r) => Date.now() - r.startedAt < day).length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const nextRun = reports
      .filter((r) => r.nextRunAt && r.schedule && r.schedule !== "off")
      .sort((a, b) => (a.nextRunAt ?? 0) - (b.nextRunAt ?? 0))[0];
    return {
      library: reports.length,
      scheduled: scheduled.length,
      runsToday,
      failed,
      nextRun,
    };
  }, [reports, runs, scheduled]);

  const openReport = reports.find((r) => r.id === openId) || null;

  const startRun = (r: SavedReport, format: ReportFormat) => {
    void runReport(r.id, format, "you@aslorig.co").then(() => {
      // poll run status after the job has had time to finish
      setTimeout(() => {
        const runs = useReports.getState().runs;
        const latest =
          runs.find((x) => x.reportId === r.id && (x.status === "running" || x.status === "queued")) ??
          runs.find((x) => x.reportId === r.id);
        if (!latest) return;
        void markRunFinished(latest.id, { status: "ready", finishedAt: Date.now() });
      }, 1400);
    });
  };

  const startNew = () => {
    void addReport({
      id: "", name: "Untitled report",
      description: "Describe what this report answers.",
      category: "sales", owner: "you@aslorig.co", favorite: false,
      schedule: "off", formats: ["csv"], recipients: [],
      createdAt: Date.now(),
    }).then((created) => {
      if (created) setOpenId(created.id);
    });
  };

  const exportRuns = () => {
    downloadCSV(`report-runs-${Date.now()}.csv`, runs.map((r) => ({
      id: r.id, report: r.reportName, category: r.category, status: r.status,
      startedAt: fmtDateTime(r.startedAt), finishedAt: fmtDateTime(r.finishedAt),
      rows: r.rows ?? "", sizeKB: r.sizeKB ?? "",
      requestedBy: r.requestedBy, format: r.format,
    })));
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "library", label: "Library", count: reports.length },
    { id: "scheduled", label: "Scheduled", count: scheduled.length },
    { id: "runs", label: "Recent runs", count: runs.length },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Saved analyses, scheduled exports and downloads for finance and ops."
        actions={
          <>
            <button
              onClick={exportRuns}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black/[0.03]"
            >
              <Download className="h-4 w-4" /> Export run log
            </button>
            <button
              onClick={startNew}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-ink/90"
            >
              <Plus className="h-4 w-4" /> New report
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Reports in library</div>
              <div className="font-display text-2xl mt-1">{kpis.library}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-sky-50 text-sky-700">
              <BarChart3 className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Across {Object.keys(CATEGORY_META).length} categories</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">On schedule</div>
              <div className="font-display text-2xl mt-1">{kpis.scheduled}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-muted text-ink">
              <Calendar className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">
            {kpis.nextRun ? `Next: ${kpis.nextRun.name} · ${fmtDateTime(kpis.nextRun.nextRunAt)}` : "Nothing queued"}
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Runs · last 24h</div>
              <div className="font-display text-2xl mt-1">{kpis.runsToday}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-gold/15 text-gold-deep">
              <Clock className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Manual + scheduled</div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[12px] text-muted-foreground">Failed runs</div>
              <div className="font-display text-2xl mt-1">{kpis.failed}</div>
            </div>
            <span className="h-9 w-9 grid place-items-center rounded-md bg-rose-50 text-rose-700">
              <AlertTriangle className="h-4 w-4" />
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-2">Retry from Recent runs</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-black/[0.06] mb-4 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label} <span className="text-muted-foreground/70">({t.count})</span>
          </button>
        ))}
      </div>

      {tab === "library" && (
        <>
          <Toolbar>
            <div className="relative flex-1 min-w-[220px] max-w-[380px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search reports by name, owner…"
                className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
              />
            </div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory | "all")}
              className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
            >
              <option value="all">All categories</option>
              {(Object.keys(CATEGORY_META) as ReportCategory[]).map((c) => (
                <option key={c} value={c}>{CATEGORY_META[c].label}</option>
              ))}
            </select>
          </Toolbar>

          {filtered.length === 0 ? (
            <Card><Empty title="No reports match" sub="Try clearing filters or add a new report." /></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((r) => {
                const meta = CATEGORY_META[r.category];
                const Icon = CATEGORY_ICON[r.category];
                return (
                  <Card key={r.id} className="cursor-pointer hover:border-black/20 transition-colors" >
                    <div className="flex items-start gap-3">
                      <div className={`h-10 w-10 rounded-md grid place-items-center shrink-0 ${
                        meta.tone === "green" ? "bg-muted text-ink" :
                        meta.tone === "gold" ? "bg-gold/15 text-gold-deep" :
                        meta.tone === "blue" ? "bg-sky-50 text-sky-700" :
                        meta.tone === "purple" ? "bg-violet-50 text-violet-700" :
                        meta.tone === "amber" ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => setOpenId(r.id)}>
                        <div className="flex items-center gap-2">
                          <div className="font-display text-[15px] truncate">{r.name}</div>
                          {r.favorite && <Star className="h-3.5 w-3.5 fill-gold text-gold" />}
                        </div>
                        <div className="text-[12.5px] text-muted-foreground line-clamp-2 mt-0.5">{r.description}</div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Chip tone={meta.tone}>{meta.label}</Chip>
                          {r.schedule && r.schedule !== "off" && (
                            <Chip tone="blue"><Calendar className="h-3 w-3" /> {r.schedule}</Chip>
                          )}
                          {r.lastStatus === "failed" && <Chip tone="red">Last run failed</Chip>}
                        </div>
                      </div>
                      <button
                        onClick={() => toggleFavorite(r.id)}
                        title={r.favorite ? "Unstar" : "Star"}
                        className="text-muted-foreground hover:text-gold"
                      >
                        <Star className={`h-4 w-4 ${r.favorite ? "fill-gold text-gold" : ""}`} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[11.5px] text-muted-foreground">
                      <span>Owner · {r.owner}</span>
                      <span>Last run · {fmtDate(r.lastRunAt)}</span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5">
                      {r.formats.map((f) => (
                        <button
                          key={f}
                          onClick={() => startRun(r, f)}
                          className="h-8 px-2.5 rounded-md border border-black/10 bg-white text-[11.5px] font-medium inline-flex items-center gap-1.5 hover:bg-black/[0.03]"
                          title={`Run and download .${f}`}
                        >
                          <Play className="h-3 w-3" /> {f.toUpperCase()}
                        </button>
                      ))}
                      <button
                        onClick={() => setOpenId(r.id)}
                        className="ml-auto h-8 px-2.5 rounded-md text-[11.5px] text-muted-foreground hover:text-ink"
                      >
                        Configure
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "scheduled" && (
        <>
          {scheduled.length === 0 ? (
            <Card><Empty title="No scheduled reports" sub="Open a report and set a schedule to have it delivered by email." /></Card>
          ) : (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 font-medium">Report</th>
                    <th className="px-3 py-2.5 font-medium">Category</th>
                    <th className="px-3 py-2.5 font-medium">Frequency</th>
                    <th className="px-3 py-2.5 font-medium">Next run</th>
                    <th className="px-3 py-2.5 font-medium">Recipients</th>
                    <th className="px-3 py-2.5 font-medium">Last</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {scheduled.map((r) => (
                    <tr
                      key={r.id}
                      className="border-t border-black/[0.05] hover:bg-black/[0.02] cursor-pointer"
                      onClick={() => setOpenId(r.id)}
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink">{r.name}</div>
                        <div className="text-[11px] text-muted-foreground">{r.id}</div>
                      </td>
                      <td className="px-3 py-3">
                        <Chip tone={CATEGORY_META[r.category].tone}>{CATEGORY_META[r.category].label}</Chip>
                      </td>
                      <td className="px-3 py-3 capitalize">{r.schedule}</td>
                      <td className="px-3 py-3 text-muted-foreground">{fmtDateTime(r.nextRunAt)}</td>
                      <td className="px-3 py-3">
                        <div className="inline-flex items-center gap-1.5 text-[12.5px]">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {r.recipients.length}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {r.lastStatus
                          ? <Chip tone={STATUS_META[r.lastStatus].tone}>{STATUS_META[r.lastStatus].label}</Chip>
                          : <span className="text-muted-foreground"> - </span>}
                      </td>
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <IconButton title="Pause" onClick={() => updateReport(r.id, { schedule: "off" })}>
                          <X className="h-4 w-4" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}

      {tab === "runs" && (
        <>
          {runs.length === 0 ? (
            <Card><Empty title="No runs yet" sub="Run a report to see its history here." /></Card>
          ) : (
            <TableWrap>
              <table className="w-full text-[13px]">
                <thead className="bg-black/[0.02] text-muted-foreground">
                  <tr className="text-left">
                    <th className="px-3 py-2.5 font-medium">Run</th>
                    <th className="px-3 py-2.5 font-medium">Report</th>
                    <th className="px-3 py-2.5 font-medium">Status</th>
                    <th className="px-3 py-2.5 font-medium">Started</th>
                    <th className="px-3 py-2.5 font-medium">Duration</th>
                    <th className="px-3 py-2.5 font-medium text-right">Rows</th>
                    <th className="px-3 py-2.5 font-medium text-right">Size</th>
                    <th className="px-3 py-2.5 font-medium">Requested by</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => {
                    const dur = run.finishedAt ? run.finishedAt - run.startedAt : undefined;
                    const FormatIcon = FORMAT_ICON[run.format];
                    return (
                      <tr key={run.id} className="border-t border-black/[0.05]">
                        <td className="px-3 py-3 font-sans text-[12px]">{run.id}</td>
                        <td className="px-3 py-3">
                          <div className="font-medium text-ink flex items-center gap-2">
                            <FormatIcon className="h-3.5 w-3.5 text-muted-foreground" /> {run.reportName}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{CATEGORY_META[run.category].label}</div>
                        </td>
                        <td className="px-3 py-3">
                          <Chip tone={STATUS_META[run.status].tone}>
                            {run.status === "ready" && <CheckCircle2 className="h-3 w-3" />}
                            {run.status === "running" && <Clock className="h-3 w-3" />}
                            {run.status === "failed" && <AlertTriangle className="h-3 w-3" />}
                            {STATUS_META[run.status].label}
                          </Chip>
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{fmtDateTime(run.startedAt)}</td>
                        <td className="px-3 py-3 tabular-nums">{duration(dur)}</td>
                        <td className="px-3 py-3 text-right tabular-nums">{run.rows ?? " - "}</td>
                        <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">
                          {run.sizeKB ? `${run.sizeKB} KB` : " - "}
                        </td>
                        <td className="px-3 py-3 text-muted-foreground">{run.requestedBy}</td>
                        <td className="px-3 py-3">
                          {run.status === "ready" ? (
                            <IconButton title="Download">
                              <Download className="h-4 w-4" />
                            </IconButton>
                          ) : run.status === "failed" ? (
                            <IconButton title="Retry">
                              <RefreshCw className="h-4 w-4" />
                            </IconButton>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}

      {openReport && (
        <ReportDrawer
          report={openReport}
          onClose={() => setOpenId(null)}
          onChange={(patch) => updateReport(openReport.id, patch)}
          onRun={(fmt) => startRun(openReport, fmt)}
          onDelete={() => { removeReport(openReport.id); setOpenId(null); }}
        />
      )}
    </div>
  );
}

function ReportDrawer({
  report, onClose, onChange, onRun, onDelete,
}: {
  report: SavedReport;
  onClose: () => void;
  onChange: (patch: Partial<SavedReport>) => void;
  onRun: (f: ReportFormat) => void;
  onDelete: () => void;
}) {
  const [recipientDraft, setRecipientDraft] = useState("");

  const toggleFormat = (f: ReportFormat) => {
    const has = report.formats.includes(f);
    onChange({ formats: has ? report.formats.filter((x) => x !== f) : [...report.formats, f] });
  };

  const addRecipient = () => {
    const v = recipientDraft.trim();
    if (!v || report.recipients.includes(v)) return;
    onChange({ recipients: [...report.recipients, v] });
    setRecipientDraft("");
  };

  const removeRecipient = (email: string) =>
    onChange({ recipients: report.recipients.filter((e) => e !== email) });

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[620px] bg-[#f7f5ef] h-full overflow-y-auto border-l border-black/10">
        <div className="sticky top-0 z-10 bg-white border-b border-black/[0.06] px-5 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg truncate">{report.name}</div>
            <div className="text-[12px] text-muted-foreground font-sans">{report.id}</div>
          </div>
          <IconButton title="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-black/[0.06] bg-white">
          {report.formats.map((f) => (
            <button
              key={f}
              onClick={() => onRun(f)}
              className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium inline-flex items-center gap-1.5"
            >
              <Play className="h-3.5 w-3.5" /> Run · {f.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onDelete}
              className="h-8 px-2 rounded-md border border-black/10 bg-white text-[12px] text-rose-700 inline-flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <Card>
            <Field label="Name">
              <input
                value={report.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
              />
            </Field>
            <div className="mt-3">
              <Field label="Description">
                <textarea
                  value={report.description}
                  onChange={(e) => onChange({ description: e.target.value })}
                  rows={2}
                  className="w-full rounded border border-black/10 bg-white p-2 text-[13px] outline-none focus:border-ink/40"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <Field label="Category">
                <select
                  value={report.category}
                  onChange={(e) => onChange({ category: e.target.value as ReportCategory })}
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px]"
                >
                  {(Object.keys(CATEGORY_META) as ReportCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_META[c].label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Owner">
                <input
                  value={report.owner}
                  onChange={(e) => onChange({ owner: e.target.value })}
                  className="w-full h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <div className="text-[12px] text-muted-foreground mb-2">Output</div>
            <div className="flex flex-wrap gap-2">
              {(["csv", "xlsx", "pdf"] as ReportFormat[]).map((f) => {
                const active = report.formats.includes(f);
                const Icon = FORMAT_ICON[f];
                return (
                  <button
                    key={f}
                    onClick={() => toggleFormat(f)}
                    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md border text-[12.5px] font-medium ${
                      active ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink hover:bg-black/[0.03]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {f.toUpperCase()}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] text-muted-foreground">Schedule</div>
              {report.schedule && report.schedule !== "off" && report.nextRunAt && (
                <div className="text-[11.5px] text-muted-foreground">Next: {fmtDateTime(report.nextRunAt)}</div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(["off", "daily", "weekly", "monthly"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onChange({
                    schedule: s,
                    nextRunAt: s === "off" ? undefined :
                      Date.now() + (s === "daily" ? 86400000 : s === "weekly" ? 86400000 * 7 : 86400000 * 30),
                  })}
                  className={`h-9 rounded border text-[13px] capitalize ${
                    report.schedule === s
                      ? "bg-ink text-white border-ink"
                      : "bg-white border-black/10 text-ink hover:bg-black/[0.03]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mt-4">
              <div className="text-[11.5px] uppercase tracking-wide text-muted-foreground mb-1.5">
                Email recipients
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {report.recipients.length === 0 && (
                  <span className="text-[12.5px] text-muted-foreground italic">
                    No recipients - deliveries will pause.
                  </span>
                )}
                {report.recipients.map((e) => (
                  <span key={e} className="inline-flex items-center gap-1.5 h-7 px-2 rounded-full border border-black/10 bg-white text-[12px]">
                    <Mail className="h-3 w-3" /> {e}
                    <button onClick={() => removeRecipient(e)} className="text-muted-foreground hover:text-rose-600">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={recipientDraft}
                  onChange={(e) => setRecipientDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addRecipient(); }}
                  placeholder="name@aslorig.co"
                  className="flex-1 h-9 px-2 rounded border border-black/10 bg-white text-[13px] outline-none focus:border-ink/40"
                />
                <button
                  onClick={addRecipient}
                  className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium"
                >
                  Add
                </button>
              </div>
            </div>
          </Card>

          <div className="flex items-center justify-end">
            <button
              onClick={onClose}
              className="h-9 px-4 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-[11.5px] uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      {children}
    </label>
  );
}
