import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "./AdminShell";
import { Card, Chip, naira, statusTone } from "./ui";
import { useConciergeRequests, type ConciergeRequest } from "@/lib/concierge-requests-store";
import {
  useConciergeChat,
  ensureThreadForRequest,
  CANNED_REPLIES,
  type ChatChannel,
} from "@/lib/concierge-chat-store";
import {
  Search, Pin, PinOff, Send, Paperclip, Smile, Sparkles, MessageSquare,
  Mail, Phone, MessageCircle, ExternalLink, CheckCheck, Clock, ChevronDown,
  FileText, DollarSign, Zap,
} from "lucide-react";

function timeAgo(t: number) {
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function channelIcon(c: ChatChannel) {
  if (c === "email") return <Mail className="h-3 w-3" />;
  if (c === "whatsapp") return <MessageCircle className="h-3 w-3" />;
  if (c === "sms") return <Phone className="h-3 w-3" />;
  return <MessageSquare className="h-3 w-3" />;
}

function channelLabel(c: ChatChannel) {
  return c === "app" ? "App chat" : c === "email" ? "Email" : c === "whatsapp" ? "WhatsApp" : "SMS";
}

export function ConciergeChat() {
  const requests = useConciergeRequests((s) => s.requests);
  const hydrate = useConciergeRequests((s) => s.hydrate);
  const chat = useConciergeChat();

  const hydrateChat = useConciergeChat((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
    void hydrateChat();
  }, [hydrate, hydrateChat]);

  // Ensure a local thread entry exists for every open request.
  useEffect(() => {
    requests
      .filter((r) => r.status !== "Cancelled")
      .forEach((r) => ensureThreadForRequest(r.id));
  }, [requests]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "pinned" | "vip">("all");
  const [channel, setChannel] = useState<ChatChannel>("app");
  const [draft, setDraft] = useState("");
  const [showCanned, setShowCanned] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const threadList = useMemo(() => {
    const arr = requests
      .filter((r) => chat.threads[r.id])
      .map((r) => ({ req: r, thread: chat.threads[r.id] }));

    return arr
      .filter(({ req, thread }) => {
        if (filter === "unread" && (thread.unread ?? 0) === 0) return false;
        if (filter === "pinned" && !thread.pinned) return false;
        if (filter === "vip" && req.priority !== "VIP") return false;
        if (query) {
          const t = query.toLowerCase();
          return (
            req.id.toLowerCase().includes(t) ||
            req.customer.name.toLowerCase().includes(t) ||
            req.brand.toLowerCase().includes(t) ||
            req.itemName.toLowerCase().includes(t)
          );
        }
        return true;
      })
      .sort((a, b) => {
        if (a.thread.pinned !== b.thread.pinned) return a.thread.pinned ? -1 : 1;
        return b.thread.lastAt - a.thread.lastAt;
      });
  }, [requests, chat.threads, filter, query]);

  // Ensure an active thread.
  useEffect(() => {
    if (!chat.activeId && threadList.length > 0) chat.setActive(threadList[0].req.id);
  }, [chat, threadList]);

  const active: { req: ConciergeRequest } | null = useMemo(() => {
    if (!chat.activeId) return null;
    const req = requests.find((r) => r.id === chat.activeId);
    return req ? { req } : null;
  }, [chat.activeId, requests]);

  const messages = chat.activeId ? chat.messages[chat.activeId] ?? [] : [];

  useEffect(() => {
    if (chat.activeId) chat.markRead(chat.activeId);
  }, [chat.activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, chat.activeId]);

  const totalUnread = Object.values(chat.threads).reduce((n, t) => n + (t.unread ?? 0), 0);
  const openConversations = threadList.length;

  const send = () => {
    if (!chat.activeId || !draft.trim()) return;
    chat.send(chat.activeId, draft.trim(), { channel, agent: "You" });
    setDraft("");
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Concierge Chat"
        subtitle="Unified conversations with concierge clients across app, WhatsApp and email"
        actions={
          <div className="flex items-center gap-2">
            <Chip tone="amber">{totalUnread} unread</Chip>
            <Chip tone="neutral">{openConversations} open</Chip>
            <Link
              to="/concierge/inbox"
              className="text-[13px] text-ink/70 hover:text-ink inline-flex items-center gap-1"
            >
              Requests inbox <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-4 h-[calc(100vh-220px)] min-h-[560px]">
        {/* ---------- Thread list ---------- */}
        <Card padded={false} className="flex flex-col overflow-hidden">
          <div className="p-3 border-b border-black/[0.06] space-y-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-ink/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search conversations"
                className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 text-sm bg-white focus:outline-none focus:border-ink"
              />
            </div>
            <div className="flex items-center gap-1">
              {(["all", "unread", "pinned", "vip"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[11px] uppercase tracking-wider px-2 py-1 rounded-md border ${
                    filter === f ? "bg-ink text-white border-ink" : "bg-white text-ink/70 border-black/10 hover:bg-black/[0.04]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadList.length === 0 && (
              <div className="p-8 text-center text-sm text-ink/50">No conversations match.</div>
            )}
            {threadList.map(({ req, thread }) => {
              const last = chat.messages[req.id]?.[chat.messages[req.id]!.length - 1];
              const isActive = chat.activeId === req.id;
              return (
                <button
                  key={req.id}
                  onClick={() => chat.setActive(req.id)}
                  className={`w-full text-left px-3 py-3 border-b border-black/[0.04] flex gap-3 transition-colors ${
                    isActive ? "bg-gold/10" : "hover:bg-black/[0.03]"
                  }`}
                >
                  <div className="relative h-9 w-9 rounded-full bg-ink text-white grid place-items-center text-[12px] font-semibold shrink-0">
                    {req.customer.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                    {thread.unread > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold grid place-items-center">
                        {thread.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[13px] font-semibold text-ink truncate flex items-center gap-1.5">
                        {thread.pinned && <Pin className="h-3 w-3 text-gold fill-gold" />}
                        {req.customer.name}
                        {req.priority === "VIP" && (
                          <Sparkles className="h-3 w-3 text-gold" />
                        )}
                      </div>
                      <span className="text-[10px] text-ink/50 shrink-0">{timeAgo(thread.lastAt)}</span>
                    </div>
                    <div className="text-[11px] text-ink/50 truncate">
                      {req.brand} · {req.itemName}
                    </div>
                    <div className="text-[12px] text-ink/70 truncate mt-0.5">
                      {last
                        ? `${last.sender === "agent" ? "You: " : ""}${last.text}`
                        : "New conversation"}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <Chip tone={statusTone(req.status)}>{req.status}</Chip>
                      {last && (
                        <span className="text-[10px] text-ink/40 inline-flex items-center gap-0.5 ml-1">
                          {channelIcon(last.channel)} {channelLabel(last.channel)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ---------- Conversation ---------- */}
        <Card padded={false} className="flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-ink/50">
              Select a conversation to start replying.
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="px-4 py-3 border-b border-black/[0.06] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-[15px] font-semibold text-ink truncate">
                      {active.req.customer.name}
                    </div>
                    <Chip tone="gold">{active.req.customer.tier}</Chip>
                    {active.req.priority === "VIP" && <Chip tone="gold">VIP</Chip>}
                    <Chip tone={statusTone(active.req.status)}>{active.req.status}</Chip>
                  </div>
                  <div className="text-[12px] text-ink/60 truncate">
                    {active.req.id} · {active.req.brand} · {active.req.itemName}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => chat.togglePin(active.req.id)}
                    title={chat.threads[active.req.id]?.pinned ? "Unpin" : "Pin"}
                    className="h-8 w-8 grid place-items-center rounded-md border border-black/10 bg-white hover:bg-black/[0.04]"
                  >
                    {chat.threads[active.req.id]?.pinned ? (
                      <PinOff className="h-4 w-4" />
                    ) : (
                      <Pin className="h-4 w-4" />
                    )}
                  </button>
                  <Link
                    to="/concierge/inbox"
                    className="h-8 px-3 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[12px] inline-flex items-center gap-1.5"
                  >
                    Open request <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-white to-black/[0.015]">
                {messages.map((m) => {
                  if (m.sender === "system") {
                    return (
                      <div key={m.id} className="text-center">
                        <span className="text-[11px] text-ink/50 bg-black/[0.04] rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {m.text}
                        </span>
                      </div>
                    );
                  }
                  const mine = m.sender === "agent";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm ${
                            mine
                              ? "bg-ink text-white rounded-br-md"
                              : "bg-white border border-black/[0.06] text-ink rounded-bl-md"
                          }`}
                        >
                          {m.text}
                          {m.quoteRef && (
                            <div className={`mt-2 pt-2 border-t ${mine ? "border-white/20" : "border-black/10"} text-[12px] flex items-center gap-2`}>
                              <FileText className="h-3.5 w-3.5" />
                              Quote {naira(m.quoteRef.amount)} · Deposit {naira(m.quoteRef.deposit)}
                            </div>
                          )}
                        </div>
                        <div className={`text-[10px] text-ink/45 flex items-center gap-1.5 px-1 ${mine ? "flex-row-reverse" : ""}`}>
                          <span>{m.authorName}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            {channelIcon(m.channel)} {channelLabel(m.channel)}
                          </span>
                          <span>·</span>
                          <span>{timeAgo(m.at)} ago</span>
                          {mine && <CheckCheck className="h-3 w-3 text-sky-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {active && chat.threads[active.req.id]?.typing && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-black/[0.06] rounded-2xl px-4 py-3 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink/30 animate-bounce" />
                      <span className="h-1.5 w-1.5 rounded-full bg-ink/30 animate-bounce [animation-delay:120ms]" />
                      <span className="h-1.5 w-1.5 rounded-full bg-ink/30 animate-bounce [animation-delay:240ms]" />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Composer */}
              <div className="border-t border-black/[0.06] bg-white">
                {showCanned && (
                  <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 border-b border-black/[0.04]">
                    {CANNED_REPLIES.map((text) => (
                      <button
                        key={text}
                        onClick={() => { setDraft(text); setShowCanned(false); }}
                        className="text-[12px] px-2.5 py-1 rounded-full border border-black/10 bg-white hover:bg-black/[0.04]"
                      >
                        {text.length > 48 ? `${text.slice(0, 48)}…` : text}
                      </button>
                    ))}
                  </div>
                )}
                <div className="px-3 pt-2 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-[11px] text-ink/60">
                    Channel:
                    {(["app", "whatsapp", "email", "sms"] as ChatChannel[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => setChannel(c)}
                        className={`px-2 py-0.5 rounded-full border text-[11px] inline-flex items-center gap-1 ${
                          channel === c ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
                        }`}
                      >
                        {channelIcon(c)} {channelLabel(c)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-3 flex items-end gap-2">
                  <div className="flex items-center gap-1">
                    <button className="h-9 w-9 grid place-items-center rounded-md border border-black/10 bg-white hover:bg-black/[0.04]" title="Attach">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowCanned((v) => !v)}
                      className={`h-9 w-9 grid place-items-center rounded-md border ${showCanned ? "bg-ink text-white border-ink" : "border-black/10 bg-white hover:bg-black/[0.04]"}`}
                      title="Canned replies"
                    >
                      <Zap className="h-4 w-4" />
                    </button>
                    <button className="h-9 w-9 grid place-items-center rounded-md border border-black/10 bg-white hover:bg-black/[0.04]" title="Emoji">
                      <Smile className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={`Reply to ${active.req.customer.name} via ${channelLabel(channel)}…`}
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-black/10 px-3 py-2 text-[13.5px] focus:outline-none focus:border-ink"
                  />
                  <button
                    onClick={send}
                    disabled={!draft.trim()}
                    className="h-9 px-4 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" /> Send
                  </button>
                </div>
              </div>
            </>
          )}
        </Card>

        {/* ---------- Context panel ---------- */}
        <Card padded={false} className="flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 grid place-items-center text-sm text-ink/50 p-6 text-center">
              Customer & request context appears here.
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-black/[0.06]">
                <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Customer</div>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-ink text-white grid place-items-center text-[13px] font-semibold">
                    {active.req.customer.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold text-ink truncate">{active.req.customer.name}</div>
                    <div className="text-[12px] text-ink/60 truncate">{active.req.customer.email}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-md bg-black/[0.03] px-2 py-2">
                    <div className="text-ink/50 uppercase tracking-wider">Tier</div>
                    <div className="text-ink font-semibold mt-0.5">{active.req.customer.tier}</div>
                  </div>
                  <div className="rounded-md bg-black/[0.03] px-2 py-2">
                    <div className="text-ink/50 uppercase tracking-wider">Priority</div>
                    <div className="text-ink font-semibold mt-0.5">{active.req.priority}</div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-black/[0.06]">
                <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Request</div>
                <div className="text-[13px] font-semibold text-ink">{active.req.brand}</div>
                <div className="text-[12px] text-ink/70 mb-2">{active.req.itemName}</div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-ink/50">Reference</div>
                    <div className="font-sans text-ink">{active.req.id}</div>
                  </div>
                  <div>
                    <div className="text-ink/50">Budget</div>
                    <div className="text-ink font-semibold">{naira(active.req.budget)}</div>
                  </div>
                  <div>
                    <div className="text-ink/50">Size</div>
                    <div className="text-ink">{active.req.size ?? " - "}</div>
                  </div>
                  <div>
                    <div className="text-ink/50">Color</div>
                    <div className="text-ink">{active.req.color ?? " - "}</div>
                  </div>
                </div>
                <p className="mt-3 text-[12px] text-ink/70 leading-relaxed">{active.req.notes}</p>
              </div>

              {active.req.quote && (
                <div className="p-4 border-b border-black/[0.06]">
                  <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Active quote</div>
                  <div className="rounded-lg border border-gold/40 bg-gold/[0.06] p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-semibold text-ink flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-gold" />
                        {naira(active.req.quote.amount)}
                      </div>
                      <span className="text-[11px] text-ink/60">Expires {new Date(active.req.quote.expiresAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-[11px] text-ink/70 mt-1">Deposit {naira(active.req.quote.deposit)}</div>
                    <button
                      onClick={() => {
                        if (!active.req.quote) return;
                        chat.send(active.req.id, `Sharing your quote for the ${active.req.brand} piece.`, {
                          channel,
                          quoteRef: { amount: active.req.quote.amount, deposit: active.req.quote.deposit },
                        });
                      }}
                      className="mt-2 w-full h-8 rounded-md bg-ink text-white text-[12px] inline-flex items-center justify-center gap-1.5"
                    >
                      <FileText className="h-3.5 w-3.5" /> Send quote in chat
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="text-[11px] uppercase tracking-wider text-ink/50 mb-2">Quick actions</div>
                <div className="grid grid-cols-1 gap-2">
                  <Link
                    to="/concierge/inbox"
                    className="h-9 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[12.5px] inline-flex items-center justify-center gap-1.5"
                  >
                    Open in Requests inbox <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to="/concierge/board"
                    className="h-9 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[12.5px] inline-flex items-center justify-center gap-1.5"
                  >
                    View on sourcing board <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to="/concierge/quotes"
                    className="h-9 rounded-md border border-black/10 bg-white hover:bg-black/[0.04] text-[12.5px] inline-flex items-center justify-center gap-1.5"
                  >
                    Manage quotes <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
