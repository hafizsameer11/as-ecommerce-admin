import { create } from "zustand";
import { reportsAdminApi } from "@/lib/api/platform";

export type ReportCategory =
  | "sales" | "finance" | "customers" | "catalog" | "concierge" | "operations" | "tax";
export type ReportFormat = "csv" | "xlsx" | "pdf";
export type ReportStatus = "ready" | "running" | "failed" | "queued";

export type SavedReport = {
  id: string;               // RPT-XXXX
  name: string;
  description: string;
  category: ReportCategory;
  /** backend generator key — kept for create/update round-trips */
  generator?: string;
  owner: string;            // email
  favorite: boolean;
  schedule?: "off" | "daily" | "weekly" | "monthly";
  nextRunAt?: number;
  lastRunAt?: number;
  lastStatus?: ReportStatus;
  formats: ReportFormat[];
  recipients: string[];     // for scheduled email
  createdAt: number;
  rowsLastRun?: number;
};

export type RecentRun = {
  id: string;               // RUN-XXXX
  reportId: string;
  reportName: string;
  category: ReportCategory;
  startedAt: number;
  finishedAt?: number;
  status: ReportStatus;
  rows?: number;
  sizeKB?: number;
  requestedBy: string;
  format: ReportFormat;
};

const CATEGORIES: ReportCategory[] = [
  "sales", "finance", "customers", "catalog", "concierge", "operations", "tax",
];
const FORMATS: ReportFormat[] = ["csv", "xlsx", "pdf"];
const STATUSES: ReportStatus[] = ["ready", "running", "failed", "queued"];
const SCHEDULES = ["off", "daily", "weekly", "monthly"] as const;

const DEFAULT_GENERATOR: Record<ReportCategory, string> = {
  sales: "sales_summary",
  finance: "wallet_liabilities",
  customers: "customer_list",
  catalog: "inventory_valuation",
  concierge: "concierge_pipeline",
  operations: "orders_export",
  tax: "vat_report",
};

function ts(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return v;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? undefined : t;
}

function mapCategory(v: unknown): ReportCategory {
  return CATEGORIES.includes(v as ReportCategory) ? (v as ReportCategory) : "sales";
}

function mapFormat(v: unknown): ReportFormat {
  return FORMATS.includes(v as ReportFormat) ? (v as ReportFormat) : "csv";
}

function mapStatus(v: unknown): ReportStatus | undefined {
  return STATUSES.includes(v as ReportStatus) ? (v as ReportStatus) : undefined;
}

function mapSchedule(v: unknown): SavedReport["schedule"] {
  return SCHEDULES.includes(v as (typeof SCHEDULES)[number])
    ? (v as SavedReport["schedule"])
    : "off";
}

function mapReport(r: Record<string, unknown>): SavedReport {
  const formats = Array.isArray(r.formats)
    ? (r.formats as unknown[]).map(mapFormat)
    : (["csv"] as ReportFormat[]);
  return {
    id: String(r.id),
    name: String(r.name ?? ""),
    description: String(r.description ?? ""),
    category: mapCategory(r.category),
    generator: r.generator ? String(r.generator) : undefined,
    owner: String(r.owner ?? ""),
    favorite: !!r.favorite,
    schedule: mapSchedule(r.schedule),
    nextRunAt: ts(r.nextRunAt),
    lastRunAt: ts(r.lastRunAt),
    lastStatus: mapStatus(r.lastStatus),
    formats: formats.length ? formats : ["csv"],
    recipients: Array.isArray(r.recipients) ? (r.recipients as string[]) : [],
    createdAt: ts(r.createdAt) ?? Date.now(),
    rowsLastRun: r.rowsLastRun != null ? Number(r.rowsLastRun) : undefined,
  };
}

function mapRun(r: Record<string, unknown>): RecentRun {
  return {
    id: String(r.id),
    reportId: String(r.reportId ?? ""),
    reportName: String(r.reportName ?? ""),
    category: mapCategory(r.category),
    startedAt: ts(r.startedAt) ?? Date.now(),
    finishedAt: ts(r.finishedAt),
    status: mapStatus(r.status) ?? "queued",
    rows: r.rows != null ? Number(r.rows) : undefined,
    sizeKB: r.sizeKB != null ? Number(r.sizeKB) : undefined,
    requestedBy: String(r.requestedBy ?? ""),
    format: mapFormat(r.format),
  };
}

type State = {
  reports: SavedReport[];
  runs: RecentRun[];
  runningIds: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addReport: (r: SavedReport) => Promise<SavedReport | undefined>;
  updateReport: (id: string, patch: Partial<SavedReport>) => Promise<void>;
  removeReport: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  runReport: (id: string, format: ReportFormat, requestedBy: string) => Promise<void>;
  markRunFinished: (runId: string, patch: Partial<RecentRun>) => Promise<void>;
};

export const useReports = create<State>()((set, get) => ({
  reports: [],
  runs: [],
  runningIds: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const [reportsRes, runsRes] = await Promise.all([
        reportsAdminApi.list({ pageSize: 100 }),
        reportsAdminApi.runs({ pageSize: 50 }),
      ]);
      const reports = (Array.isArray(reportsRes.data) ? reportsRes.data : []).map((r) =>
        mapReport(r as Record<string, unknown>),
      );
      const runs = (Array.isArray(runsRes.data) ? runsRes.data : []).map((r) =>
        mapRun(r as Record<string, unknown>),
      );
      set({
        reports,
        runs,
        runningIds: runs.filter((r) => r.status === "running" || r.status === "queued").map((r) => r.id),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[reports] hydrate failed", err);
      set({ hydrated: true });
    }
  },

  addReport: async (r) => {
    try {
      const created = mapReport(
        (await reportsAdminApi.create({
          name: r.name || "Untitled report",
          description: r.description ?? "",
          generator: r.generator ?? DEFAULT_GENERATOR[r.category] ?? "sales_summary",
          category: r.category,
          favorite: r.favorite ?? false,
          schedule: r.schedule ?? "off",
          formats: r.formats?.length ? r.formats : ["csv"],
          recipients: r.recipients ?? [],
        })) as Record<string, unknown>,
      );
      set((st) => ({ reports: [created, ...st.reports] }));
      return created;
    } catch (err) {
      console.warn("[reports] addReport failed", err);
      return undefined;
    }
  },

  updateReport: async (id, patch) => {
    const body: Record<string, unknown> = {};
    if (patch.name !== undefined) body.name = patch.name;
    if (patch.description !== undefined) body.description = patch.description;
    if (patch.category !== undefined) body.category = patch.category;
    if (patch.generator !== undefined) body.generator = patch.generator;
    if (patch.favorite !== undefined) body.favorite = patch.favorite;
    if (patch.schedule !== undefined) body.schedule = patch.schedule;
    if (patch.formats !== undefined) body.formats = patch.formats;
    if (patch.recipients !== undefined) body.recipients = patch.recipients;

    // optimistic for lastRun* which are derived server-side
    if (patch.lastRunAt !== undefined || patch.lastStatus !== undefined || patch.rowsLastRun !== undefined) {
      set((st) => ({
        reports: st.reports.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      }));
    }

    if (!Object.keys(body).length) return;

    try {
      const res = (await reportsAdminApi.update(id, body)) as Record<string, unknown>;
      const updated = mapReport((res.after ?? res) as Record<string, unknown>);
      set((st) => ({
        reports: st.reports.map((r) => (r.id === id ? { ...r, ...updated } : r)),
      }));
    } catch (err) {
      console.warn("[reports] updateReport failed", err);
      await get().hydrate();
    }
  },

  removeReport: async (id) => {
    try {
      await reportsAdminApi.remove(id);
      set((st) => ({ reports: st.reports.filter((r) => r.id !== id) }));
    } catch (err) {
      console.warn("[reports] removeReport failed", err);
    }
  },

  toggleFavorite: async (id) => {
    try {
      const updated = mapReport((await reportsAdminApi.favorite(id)) as Record<string, unknown>);
      set((st) => ({
        reports: st.reports.map((r) => (r.id === id ? updated : r)),
      }));
    } catch (err) {
      console.warn("[reports] toggleFavorite failed", err);
    }
  },

  runReport: async (id, format, _requestedBy) => {
    try {
      const run = mapRun((await reportsAdminApi.run(id, { format })) as Record<string, unknown>);
      const rpt = get().reports.find((r) => r.id === id);
      if (rpt && !run.reportName) run.reportName = rpt.name;
      if (rpt && !run.category) run.category = rpt.category;
      set((st) => ({
        runs: [run, ...st.runs].slice(0, 40),
        runningIds: [...st.runningIds, run.id],
        reports: st.reports.map((r) =>
          r.id === id ? { ...r, lastRunAt: run.startedAt, lastStatus: run.status } : r,
        ),
      }));
    } catch (err) {
      console.warn("[reports] runReport failed", err);
    }
  },

  markRunFinished: async (runId, patch) => {
    try {
      const raw = (await reportsAdminApi.getRun(runId)) as Record<string, unknown>;
      const run = mapRun(raw);
      set((st) => ({
        runs: st.runs.map((r) => (r.id === runId ? { ...r, ...run } : r)),
        runningIds: st.runningIds.filter((x) => x !== runId),
        reports: st.reports.map((r) =>
          r.id === run.reportId
            ? {
                ...r,
                lastRunAt: run.startedAt,
                lastStatus: run.status,
                rowsLastRun: run.rows ?? r.rowsLastRun,
              }
            : r,
        ),
      }));
    } catch {
      // fallback to optimistic patch if poll fails (keeps UI simulation path working)
      set((st) => ({
        runs: st.runs.map((r) => (r.id === runId ? { ...r, ...patch } : r)),
        runningIds: st.runningIds.filter((x) => x !== runId),
      }));
    }
  },
}));

export const CATEGORY_META: Record<
  ReportCategory,
  { label: string; tone: "neutral" | "gold" | "green" | "red" | "blue" | "amber" | "purple" | "slate" }
> = {
  sales:      { label: "Sales",      tone: "green" },
  finance:    { label: "Finance",    tone: "gold" },
  customers:  { label: "Customers",  tone: "blue" },
  catalog:    { label: "Catalog",    tone: "purple" },
  concierge:  { label: "Concierge",  tone: "gold" },
  operations: { label: "Operations", tone: "slate" },
  tax:        { label: "Tax",        tone: "amber" },
};

export const STATUS_META: Record<
  ReportStatus,
  { label: string; tone: "neutral" | "gold" | "green" | "red" | "blue" | "amber" | "purple" | "slate" }
> = {
  ready:   { label: "Ready",   tone: "green" },
  running: { label: "Running", tone: "blue" },
  failed:  { label: "Failed",  tone: "red" },
  queued:  { label: "Queued",  tone: "amber" },
};
