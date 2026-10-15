import { create } from "zustand";
import { toast } from "sonner";
import { ApiError } from "@/lib/api/client";
import { teamAdminApi } from "@/lib/api/platform";
import { conciergeAdminApi, koboToNaira, nairaToKobo, type AdminConciergeRow } from "@/lib/api/loyalty";

export type ConciergeStatus =
  | "New"
  | "Sourcing"
  | "Quoted"
  | "Approved"
  | "Ordered"
  | "In Transit"
  | "Delivered"
  | "Cancelled"
  | "Payment Pending"
  | "Unavailable";

export type ConciergePriority = "Standard" | "Priority" | "VIP";

export type ConciergeTimelineEntry = {
  at: number;
  by: string;
  kind: "note" | "status" | "message" | "quote";
  text: string;
};

export type ConciergeRequest = {
  id: string;
  apiId: string;
  customer: { name: string; email: string; tier: "Guest" | "Member" | "Gold" | "Platinum" };
  category: "Footwear" | "Fashion" | "Fragrance" | "Accessories" | "Watches" | "Jewelry";
  brand: string;
  itemName: string;
  reference?: string;
  notes: string;
  size?: string;
  color?: string;
  budget: number;
  status: ConciergeStatus;
  statusKey: string;
  priority: ConciergePriority;
  assignee: string | null;
  createdAt: number;
  updatedAt: number;
  slaDueAt: number;
  images: string[];
  quote?: { amount: number; deposit: number; expiresAt: number } | null;
  timeline: ConciergeTimelineEntry[];
};

const STATUS_FROM_API: Record<string, ConciergeStatus> = {
  new: "New",
  sourcing: "Sourcing",
  quoted: "Quoted",
  approved: "Approved",
  payment_pending: "Payment Pending",
  ordered: "Ordered",
  in_transit: "In Transit",
  delivered: "Delivered",
  cancelled: "Cancelled",
  unavailable: "Unavailable",
};

const STATUS_TO_API: Record<ConciergeStatus, string> = {
  New: "new",
  Sourcing: "sourcing",
  Quoted: "quoted",
  Approved: "approved",
  "Payment Pending": "payment_pending",
  Ordered: "ordered",
  "In Transit": "in_transit",
  Delivered: "delivered",
  Cancelled: "cancelled",
  Unavailable: "unavailable",
};

const PRIORITY_FROM: Record<string, ConciergePriority> = {
  standard: "Standard",
  priority: "Priority",
  vip: "VIP",
};

const PRIORITY_TO: Record<ConciergePriority, "standard" | "priority" | "vip"> = {
  Standard: "standard",
  Priority: "priority",
  VIP: "vip",
};

function mapCategory(c: string): ConciergeRequest["category"] {
  const key = c.toLowerCase();
  if (key.includes("foot") || key.includes("sneaker") || key.includes("shoe")) return "Footwear";
  if (key.includes("frag") || key.includes("perfume")) return "Fragrance";
  if (key.includes("watch")) return "Watches";
  if (key.includes("jewel")) return "Jewelry";
  if (key.includes("accessor")) return "Accessories";
  return "Fashion";
}

function mapTier(t?: string | null): ConciergeRequest["customer"]["tier"] {
  if (t === "Gold" || t === "Signature") return t === "Signature" ? "Platinum" : "Gold";
  if (t === "Silver" || t === "Standard") return "Member";
  return "Guest";
}

function mapRow(r: AdminConciergeRow): ConciergeRequest {
  const statusKey = r.status;
  const status = STATUS_FROM_API[statusKey] ?? ((r.statusLabel as ConciergeStatus) || "New");
  const quote = r.quote
    ? {
        amount: koboToNaira(r.quote.total ?? r.quote.amount ?? 0),
        deposit: koboToNaira(r.quote.deposit ?? 0),
        expiresAt: r.quote.expiresAt ? new Date(r.quote.expiresAt).getTime() : Date.now() + 72 * 3_600_000,
      }
    : null;
  return {
    id: r.number || r.id,
    apiId: r.id,
    customer: {
      name: r.customer?.name || "Guest",
      email: r.customer?.email || "",
      tier: mapTier(r.customer?.tier),
    },
    category: mapCategory(r.category || "Fashion"),
    brand: r.brand || "",
    itemName: r.itemName || "",
    reference: r.reference ?? undefined,
    notes: r.notes || "",
    size: r.size ?? undefined,
    color: r.color ?? undefined,
    budget: r.budget != null ? koboToNaira(r.budget) : 0,
    status,
    statusKey,
    priority: PRIORITY_FROM[r.priority?.toLowerCase?.() ?? ""] ?? "Standard",
    assignee: r.assignee?.name ?? null,
    createdAt: new Date(r.createdAt).getTime(),
    updatedAt: new Date(r.updatedAt).getTime(),
    slaDueAt: r.slaDueAt ? new Date(r.slaDueAt).getTime() : Date.now() + 24 * 3_600_000,
    images: r.images ?? [],
    quote,
    timeline: (r.timeline ?? [])
      .filter((t) => !t.internal)
      .map((t) => ({
        at: new Date(t.at).getTime(),
        by: t.by,
        kind: (t.kind as ConciergeTimelineEntry["kind"]) || "note",
        text: t.text,
      })),
  };
}

export type ConciergeAgent = { id: string; name: string };

type State = {
  requests: ConciergeRequest[];
  agents: ConciergeAgent[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  assign: (id: string, agent: string) => Promise<void>;
  setStatus: (id: string, status: ConciergeStatus) => Promise<void>;
  setPriority: (id: string, priority: ConciergePriority) => Promise<void>;
  addNote: (id: string, by: string, text: string) => Promise<void>;
  addQuote: (id: string, amount: number, depositPct?: number) => Promise<void>;
};

function findApiId(s: State, id: string) {
  return s.requests.find((r) => r.id === id || r.apiId === id)?.apiId ?? id;
}

export const useConciergeRequests = create<State>()((set, get) => ({
  requests: [],
  agents: [],
  hydrated: false,
  hydrate: async () => {
    try {
      const [{ data }, membersRaw] = await Promise.all([
        conciergeAdminApi.listRequests(),
        teamAdminApi.members().catch(() => []),
      ]);
      const members = (Array.isArray(membersRaw) ? membersRaw : []) as Record<string, unknown>[];
      const agents: ConciergeAgent[] = members
        .filter((m) => m.status === "active" || m.status === undefined)
        .map((m) => ({ id: String(m.id), name: String(m.name ?? "") }))
        .filter((a) => a.name);
      set({ requests: data.map(mapRow), agents, hydrated: true });
    } catch (err) {
      console.warn("[concierge] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  assign: async (id, agent) => {
    const apiId = findApiId(get(), id);
    const adminId = agent ? get().agents.find((a) => a.name === agent)?.id ?? null : null;
    const prev = get().requests.find((r) => r.id === id || r.apiId === id);
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id || r.apiId === id
          ? {
              ...r,
              assignee: agent || null,
              updatedAt: Date.now(),
              timeline: agent
                ? [...r.timeline, { at: Date.now(), by: "You", kind: "note", text: `Assigned to ${agent}.` }]
                : r.timeline,
            }
          : r
      ),
    }));
    try {
      await conciergeAdminApi.assign(apiId, adminId);
    } catch (err) {
      console.warn("[concierge] assign sync", err);
      toast.error(err instanceof ApiError ? err.message : "Could not assign agent");
      if (prev) {
        set((s) => ({
          requests: s.requests.map((r) => (r.id === id || r.apiId === id ? prev : r)),
        }));
      } else {
        await get().hydrate();
      }
    }
  },
  setStatus: async (id, status) => {
    const apiId = findApiId(get(), id);
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id || r.apiId === id
          ? {
              ...r,
              status,
              statusKey: STATUS_TO_API[status],
              updatedAt: Date.now(),
              timeline: [...r.timeline, { at: Date.now(), by: "You", kind: "status", text: `Status → ${status}` }],
            }
          : r
      ),
    }));
    try {
      await conciergeAdminApi.setStatus(apiId, STATUS_TO_API[status]);
    } catch (err) {
      console.warn("[concierge] status sync", err);
      await get().hydrate();
    }
  },
  setPriority: async (id, priority) => {
    const apiId = findApiId(get(), id);
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id || r.apiId === id ? { ...r, priority, updatedAt: Date.now() } : r
      ),
    }));
    try {
      await conciergeAdminApi.setPriority(apiId, PRIORITY_TO[priority]);
    } catch (err) {
      console.warn("[concierge] priority sync", err);
    }
  },
  addNote: async (id, by, text) => {
    const apiId = findApiId(get(), id);
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id || r.apiId === id
          ? {
              ...r,
              updatedAt: Date.now(),
              timeline: [...r.timeline, { at: Date.now(), by, kind: "note", text }],
            }
          : r
      ),
    }));
    try {
      await conciergeAdminApi.addNote(apiId, text, true);
    } catch (err) {
      console.warn("[concierge] note sync", err);
    }
  },
  addQuote: async (id, amount, depositPct = 30) => {
    const apiId = findApiId(get(), id);
    const deposit = Math.round((amount * depositPct) / 100);
    set((s) => ({
      requests: s.requests.map((r) =>
        r.id === id || r.apiId === id
          ? {
              ...r,
              status: "Quoted",
              statusKey: "quoted",
              quote: { amount, deposit, expiresAt: Date.now() + 72 * 3_600_000 },
              updatedAt: Date.now(),
              timeline: [
                ...r.timeline,
                { at: Date.now(), by: "You", kind: "quote", text: `Quote ₦${amount.toLocaleString()} sent.` },
              ],
            }
          : r
      ),
    }));
    try {
      await conciergeAdminApi.createQuote(apiId, {
        lines: [{ name: get().requests.find((r) => r.apiId === apiId)?.itemName || "Item", qty: 1, price: nairaToKobo(amount) }],
        depositPct,
      });
    } catch (err) {
      console.warn("[concierge] quote sync", err);
      await get().hydrate();
    }
  },
}));

/** @deprecated Use `useConciergeRequests(s => s.agents)` */
export const AGENT_LIST: string[] = [];
