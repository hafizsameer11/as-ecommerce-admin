import { create } from "zustand";
import { conciergeAdminApi } from "@/lib/api/loyalty";

export type ChatChannel = "app" | "email" | "whatsapp" | "sms";
export type ChatSender = "customer" | "agent" | "system";

export type ChatMessage = {
  id: string;
  threadId: string;
  sender: ChatSender;
  authorName: string;
  channel: ChatChannel;
  text: string;
  at: number;
  attachments?: { name: string; kind: "image" | "file"; url?: string }[];
  quoteRef?: { amount: number; deposit: number };
  read: boolean;
};

export type ChatThread = {
  id: string;
  pinned: boolean;
  unread: number;
  lastAt: number;
  typing: boolean;
  apiThreadId?: string;
};

type State = {
  threads: Record<string, ChatThread>;
  messages: Record<string, ChatMessage[]>;
  activeId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  setActive: (id: string | null) => void;
  ensureThread: (id: string) => void;
  send: (
    threadId: string,
    text: string,
    opts?: {
      channel?: ChatChannel;
      attachments?: ChatMessage["attachments"];
      quoteRef?: ChatMessage["quoteRef"];
      agent?: string;
    }
  ) => Promise<void>;
  markRead: (threadId: string) => void;
  togglePin: (threadId: string) => void;
  simulateReply: (threadId: string, customerName: string) => void;
};

const nid = () => Math.random().toString(36).slice(2, 10);

function mapMessage(threadId: string, m: Record<string, unknown>): ChatMessage {
  const senderRaw = String(m.sender || m.authorRole || "agent");
  const sender: ChatSender =
    senderRaw === "customer" || senderRaw === "system" ? senderRaw : "agent";
  return {
    id: String(m.id || nid()),
    threadId,
    sender,
    authorName: String(m.authorName || m.by || (sender === "customer" ? "Customer" : "Agent")),
    channel: (m.channel as ChatChannel) || "app",
    text: String(m.text || m.body || ""),
    at: m.at || m.createdAt ? new Date(String(m.at || m.createdAt)).getTime() : Date.now(),
    read: m.read !== false,
  };
}

export const useConciergeChat = create<State>()((set, get) => ({
  threads: {},
  messages: {},
  activeId: null,
  hydrated: false,
  hydrate: async () => {
    try {
      const { data } = await conciergeAdminApi.listThreads({ pageSize: 50 });
      const threads: Record<string, ChatThread> = {};
      for (const raw of data as Record<string, unknown>[]) {
        const requestId = String(raw.requestId || raw.requestNumber || raw.id);
        const id = String(raw.requestNumber || raw.requestId || raw.id);
        threads[id] = {
          id,
          pinned: !!raw.pinned,
          unread: Number(raw.unread ?? 0),
          lastAt: raw.lastAt || raw.updatedAt ? new Date(String(raw.lastAt || raw.updatedAt)).getTime() : Date.now(),
          typing: false,
          apiThreadId: String(raw.id || requestId),
        };
      }
      set({ threads, hydrated: true });
    } catch (err) {
      console.warn("[concierge-chat] hydrate failed", err);
      set({ hydrated: true });
    }
  },
  loadMessages: async (threadId) => {
    const thread = get().threads[threadId];
    const apiId = thread?.apiThreadId || threadId;
    try {
      const rows = (await conciergeAdminApi.threadMessages(apiId)) as Record<string, unknown>[] | { data?: Record<string, unknown>[] };
      const list = Array.isArray(rows) ? rows : rows.data ?? [];
      set((s) => ({
        messages: { ...s.messages, [threadId]: list.map((m) => mapMessage(threadId, m)) },
      }));
    } catch (err) {
      console.warn("[concierge-chat] messages failed", err);
    }
  },
  setActive: (id) => {
    set({ activeId: id });
    if (id) void get().loadMessages(id);
  },
  ensureThread: (id) => {
    if (get().threads[id]) return;
    set((s) => ({
      threads: {
        ...s.threads,
        [id]: { id, pinned: false, unread: 0, lastAt: Date.now(), typing: false, apiThreadId: id },
      },
    }));
  },
  send: async (threadId, text, opts = {}) => {
    const msg: ChatMessage = {
      id: nid(),
      threadId,
      sender: "agent",
      authorName: opts.agent ?? "You",
      channel: opts.channel ?? "app",
      text,
      at: Date.now(),
      attachments: opts.attachments,
      quoteRef: opts.quoteRef,
      read: true,
    };
    set((s) => ({
      messages: { ...s.messages, [threadId]: [...(s.messages[threadId] ?? []), msg] },
      threads: {
        ...s.threads,
        [threadId]: {
          ...(s.threads[threadId] ?? {
            id: threadId,
            pinned: false,
            unread: 0,
            lastAt: 0,
            typing: false,
          }),
          lastAt: Date.now(),
          unread: 0,
        },
      },
    }));
    try {
      const apiId = get().threads[threadId]?.apiThreadId || threadId;
      await conciergeAdminApi.sendMessage(apiId, text);
      await get().loadMessages(threadId);
    } catch (err) {
      console.warn("[concierge-chat] send sync", err);
    }
  },
  markRead: (threadId) => {
    set((s) => ({
      threads: {
        ...s.threads,
        [threadId]: {
          ...(s.threads[threadId] ?? {
            id: threadId,
            pinned: false,
            unread: 0,
            lastAt: 0,
            typing: false,
          }),
          unread: 0,
        },
      },
      messages: {
        ...s.messages,
        [threadId]: (s.messages[threadId] ?? []).map((m) => ({ ...m, read: true })),
      },
    }));
  },
  togglePin: (threadId) =>
    set((s) => ({
      threads: {
        ...s.threads,
        [threadId]: {
          ...(s.threads[threadId] ?? {
            id: threadId,
            pinned: false,
            unread: 0,
            lastAt: 0,
            typing: false,
          }),
          pinned: !s.threads[threadId]?.pinned,
        },
      },
    })),
  simulateReply: () => {
    /* no-op — live replies come from the API */
  },
}));

export function ensureThreadForRequest(id: string) {
  useConciergeChat.getState().ensureThread(id);
}

export const CANNED_REPLIES = [
  "Thanks for your patience — we're confirming availability with our partners now.",
  "I've sent a formal quote. Let me know if you'd like to proceed with the deposit.",
  "Authenticity is verified before we place the order. Happy to share provenance details.",
  "We can hold the piece for 48 hours once the deposit clears.",
];
