import { create } from "zustand";
import { ticketsAdminApi } from "@/lib/api/cms";

export type TicketStatus = "open" | "pending" | "on_hold" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketChannel = "email" | "chat" | "whatsapp" | "instagram" | "phone";
export type TicketCategory =
  | "order" | "delivery" | "returns" | "payment" | "product" | "concierge" | "account" | "other";

export type TicketMessage = {
  id: string;
  author: "customer" | "agent" | "system";
  authorName: string;
  body: string;
  at: number;
  internal?: boolean;
};

export type Ticket = {
  id: string;
  number: string;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  channel: TicketChannel;
  category: TicketCategory;
  customerName: string;
  customerEmail: string;
  customerAvatar?: string;
  orderRef?: string;
  /** AdminUser id when assigned */
  assigneeId?: string;
  /** Display name from API */
  assignee?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  firstResponseAt?: number;
  slaDueAt: number;
  messages: TicketMessage[];
  customerCreated?: boolean;
};

function ms(v: unknown, fallback = Date.now()): number {
  if (!v) return fallback;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? fallback : t;
}

function msOpt(v: unknown): number | undefined {
  if (!v) return undefined;
  const t = new Date(v as string).getTime();
  return Number.isNaN(t) ? undefined : t;
}

const CHANNELS: TicketChannel[] = ["email", "chat", "whatsapp", "instagram", "phone"];

function mapMessage(m: Record<string, unknown>): TicketMessage {
  return {
    id: String(m.id),
    author: (m.author as TicketMessage["author"]) || "system",
    authorName: String(m.authorName ?? ""),
    body: String(m.body ?? ""),
    at: ms(m.at),
    internal: !!m.internal,
  };
}

function mapTicket(t: Record<string, unknown>): Ticket {
  const channel = CHANNELS.includes(t.channel as TicketChannel) ? (t.channel as TicketChannel) : "email";
  return {
    id: String(t.id),
    number: String(t.number ?? ""),
    subject: String(t.subject ?? ""),
    status: (t.status as TicketStatus) || "open",
    priority: (t.priority as TicketPriority) || "normal",
    channel,
    category: (t.category as TicketCategory) || "other",
    customerName: String(t.customerName ?? "Customer"),
    customerEmail: String(t.customerEmail ?? ""),
    orderRef: t.orderRef ? String(t.orderRef) : undefined,
    assigneeId: t.assigneeId ? String(t.assigneeId) : undefined,
    assignee: t.assignee ? String(t.assignee) : undefined,
    tags: Array.isArray(t.tags) ? (t.tags as string[]) : [],
    createdAt: ms(t.createdAt),
    updatedAt: ms(t.updatedAt),
    firstResponseAt: msOpt(t.firstResponseAt),
    slaDueAt: ms(t.slaDueAt, Date.now() + 8 * 60 * 60 * 1000),
    messages: Array.isArray(t.messages) ? (t.messages as Record<string, unknown>[]).map(mapMessage) : [],
    customerCreated: !!t.customerCreated,
  };
}

type State = {
  tickets: Ticket[];
  selectedId: string | null;
  filter: TicketStatus | "all";
  search: string;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  select: (id: string | null) => void;
  setFilter: (f: State["filter"]) => void;
  setSearch: (s: string) => void;
  reply: (id: string, body: string, internal?: boolean) => Promise<void>;
  setStatus: (id: string, status: TicketStatus) => Promise<void>;
  setPriority: (id: string, p: TicketPriority) => Promise<void>;
  assign: (id: string, adminId: string | null, displayName?: string) => Promise<void>;
  reset: () => void;
};

export const useTickets = create<State>()((set, get) => ({
  tickets: [],
  selectedId: null,
  filter: "all",
  search: "",
  hydrated: false,

  hydrate: async () => {
    try {
      const { data } = await ticketsAdminApi.list({ pageSize: 100 });
      const tickets = (data as Record<string, unknown>[]).map(mapTicket);
      set((s) => ({
        tickets,
        selectedId: s.selectedId ?? tickets[0]?.id ?? null,
        hydrated: true,
      }));
      const toLoad = get().selectedId;
      if (toLoad) void get().loadDetail(toLoad);
    } catch (err) {
      console.warn("[tickets] hydrate failed", err);
      set({ hydrated: true });
    }
  },

  loadDetail: async (id) => {
    try {
      const full = mapTicket((await ticketsAdminApi.get(id)) as Record<string, unknown>);
      set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? full : t)) }));
    } catch (err) {
      console.warn("[tickets] loadDetail failed", err);
    }
  },

  select: (id) => {
    set({ selectedId: id });
    if (id) {
      const t = get().tickets.find((x) => x.id === id);
      if (!t || t.messages.length === 0) void get().loadDetail(id);
    }
  },
  setFilter: (filter) => set({ filter }),
  setSearch: (search) => set({ search }),

  reply: async (id, body, internal) => {
    const tempId = `tmp-${Date.now()}`;
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id
          ? {
              ...t,
              updatedAt: Date.now(),
              status: internal ? t.status : t.status === "open" ? "pending" : t.status,
              messages: [...t.messages, { id: tempId, author: "agent", authorName: "You", body, at: Date.now(), internal }],
            }
          : t,
      ),
    }));
    try {
      const updated = mapTicket((await ticketsAdminApi.reply(id, { body, internal })) as Record<string, unknown>);
      set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.warn("[tickets] reply sync", err);
      await get().loadDetail(id);
    }
  },

  setStatus: async (id, status) => {
    set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, status, updatedAt: Date.now() } : t)) }));
    try {
      const updated = mapTicket((await ticketsAdminApi.setStatus(id, status)) as Record<string, unknown>);
      set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.warn("[tickets] setStatus sync", err);
      await get().loadDetail(id);
    }
  },

  setPriority: async (id, priority) => {
    set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, priority, updatedAt: Date.now() } : t)) }));
    try {
      const updated = mapTicket((await ticketsAdminApi.setPriority(id, priority)) as Record<string, unknown>);
      set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.warn("[tickets] setPriority sync", err);
      await get().loadDetail(id);
    }
  },

  assign: async (id, adminId, displayName) => {
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id
          ? {
              ...t,
              assigneeId: adminId ?? undefined,
              assignee: adminId ? displayName ?? t.assignee : undefined,
              updatedAt: Date.now(),
            }
          : t,
      ),
    }));
    try {
      const updated = mapTicket(
        (await ticketsAdminApi.assign(id, adminId)) as Record<string, unknown>,
      );
      set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? updated : t)) }));
    } catch (err) {
      console.warn("[tickets] assign sync", err);
      await get().loadDetail(id);
    }
  },

  reset: () => void get().hydrate(),
}));
