import { create } from "zustand";
import { auditAdminApi } from "@/lib/api/platform";

export type AuditSeverity = "info" | "notice" | "warning" | "critical";
export type AuditCategory =
  | "auth"
  | "orders"
  | "catalog"
  | "inventory"
  | "customers"
  | "finance"
  | "marketing"
  | "content"
  | "concierge"
  | "team"
  | "settings"
  | "system";

export type AuditEvent = {
  id: string;
  at: string;                // ISO
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: string;            // e.g. "order.refund"
  category: AuditCategory;
  severity: AuditSeverity;
  entity: string;            // e.g. "Order #ASL-10248"
  entityId?: string;
  summary: string;
  ip: string;
  location: string;
  device: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

const CATEGORIES: AuditCategory[] = [
  "auth", "orders", "catalog", "inventory", "customers", "finance",
  "marketing", "content", "concierge", "team", "settings", "system",
];
const SEVERITIES: AuditSeverity[] = ["info", "notice", "warning", "critical"];

function mapEvent(e: Record<string, unknown>): AuditEvent {
  const category = CATEGORIES.includes(e.category as AuditCategory)
    ? (e.category as AuditCategory)
    : "system";
  const severity = SEVERITIES.includes(e.severity as AuditSeverity)
    ? (e.severity as AuditSeverity)
    : "info";
  const atRaw = e.at ?? e.createdAt;
  const at = atRaw ? new Date(atRaw as string).toISOString() : new Date().toISOString();
  return {
    id: String(e.id),
    at,
    actorName: String(e.actorName ?? "System"),
    actorEmail: String(e.actorEmail ?? ""),
    actorRole: String(e.actorRole ?? ""),
    action: String(e.action ?? ""),
    category,
    severity,
    entity: String(e.entity ?? ""),
    entityId: e.entityId ? String(e.entityId) : undefined,
    summary: String(e.summary ?? ""),
    ip: String(e.ip ?? ""),
    location: String(e.location ?? ""),
    device: String(e.device ?? ""),
    before: e.before && typeof e.before === "object" ? (e.before as Record<string, unknown>) : undefined,
    after: e.after && typeof e.after === "object" ? (e.after as Record<string, unknown>) : undefined,
  };
}

type State = {
  events: AuditEvent[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  log: (e: Omit<AuditEvent, "id" | "at"> & { at?: string }) => void;
  clear: () => void;
};

export const useAudit = create<State>()((set, get) => ({
  events: [],
  hydrated: false,

  hydrate: async () => {
    try {
      const { data } = await auditAdminApi.list({ pageSize: 100 });
      const rows = Array.isArray(data) ? data : [];
      set({
        events: rows.map((r) => mapEvent(r as Record<string, unknown>)),
        hydrated: true,
      });
    } catch (err) {
      console.warn("[audit] hydrate failed", err);
      set({ hydrated: true });
    }
  },

  log: (e) =>
    set({
      events: [
        { ...e, id: `a_${Date.now().toString(36)}`, at: e.at ?? new Date().toISOString() },
        ...get().events,
      ],
    }),

  clear: () => set({ events: [] }),
}));

export const CATEGORY_LABEL: Record<AuditCategory, string> = {
  auth: "Authentication",
  orders: "Orders",
  catalog: "Catalog",
  inventory: "Inventory",
  customers: "Customers",
  finance: "Finance",
  marketing: "Marketing",
  content: "Content",
  concierge: "Concierge",
  team: "Team",
  settings: "Settings",
  system: "System",
};

export const SEVERITY_LABEL: Record<AuditSeverity, string> = {
  info: "Info",
  notice: "Notice",
  warning: "Warning",
  critical: "Critical",
};
