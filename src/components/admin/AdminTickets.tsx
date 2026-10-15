import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip } from "./ui";
import {
  useTickets,
  type Ticket, type TicketStatus, type TicketPriority, type TicketChannel,
} from "@/lib/tickets-store";
import { useTeam } from "@/lib/team-store";
import {
  Search, Mail, MessageCircle, Phone, Instagram, MessageSquare,
  Clock, User, Tag, ArrowRight, Send, Lock, CheckCircle2, PauseCircle, XCircle,
  AlertTriangle, TicketIcon,
} from "lucide-react";

const STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open", pending: "Pending", on_hold: "On hold", resolved: "Resolved", closed: "Closed",
};

const STATUS_TONE: Record<TicketStatus, "green" | "amber" | "purple" | "blue" | "slate"> = {
  open: "blue", pending: "amber", on_hold: "purple", resolved: "green", closed: "slate",
};

const PRIORITY_TONE: Record<TicketPriority, "green" | "amber" | "red" | "neutral"> = {
  low: "neutral", normal: "green", high: "amber", urgent: "red",
};

const CHANNEL_ICON: Record<TicketChannel, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  chat: <MessageSquare className="h-3.5 w-3.5" />,
  whatsapp: <MessageCircle className="h-3.5 w-3.5" />,
  instagram: <Instagram className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
};

const CHANNEL_LABEL: Record<TicketChannel, string> = {
  email: "Email", chat: "Live Chat", whatsapp: "WhatsApp", instagram: "Instagram", phone: "Phone",
};

function timeAgo(ts: number) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function slaBadge(t: Ticket) {
  if (t.status === "resolved" || t.status === "closed") return null;
  const remaining = t.slaDueAt - Date.now();
  if (remaining < 0) {
    return <Chip tone="red"><AlertTriangle className="h-3 w-3" /> SLA breached</Chip>;
  }
  const h = Math.floor(remaining / (60 * 60 * 1000));
  const m = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return (
    <Chip tone={remaining < 2 * 60 * 60 * 1000 ? "amber" : "neutral"}>
      <Clock className="h-3 w-3" /> {h > 0 ? `${h}h ${m}m` : `${m}m`}
    </Chip>
  );
}

export function AdminTickets() {
  const { tickets, selectedId, filter, search, hydrate, select, setFilter, setSearch, reply, setStatus, setPriority, assign } = useTickets();
  const teamMembers = useTeam((s) => s.members);
  const hydrateTeam = useTeam((s) => s.hydrate);
  const [draft, setDraft] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  useEffect(() => {
    void hydrate();
    void hydrateTeam();
  }, [hydrate, hydrateTeam]);

  const agents = useMemo(
    () => teamMembers.filter((m) => m.status === "active" || m.status === "invited"),
    [teamMembers],
  );

  const counts = useMemo(() => {
    const c: Record<TicketStatus | "all", number> = { all: 0, open: 0, pending: 0, on_hold: 0, resolved: 0, closed: 0 };
    for (const t of tickets) {
      c.all++; c[t.status]++;
    }
    return c;
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return tickets
      .filter((t) => (filter === "all" ? true : t.status === filter))
      .filter((t) =>
        !q ? true :
          t.subject.toLowerCase().includes(q) ||
          t.customerName.toLowerCase().includes(q) ||
          t.customerEmail.toLowerCase().includes(q) ||
          t.number.toLowerCase().includes(q) ||
          (t.orderRef?.toLowerCase().includes(q) ?? false),
      )
      .sort((a, b) => {
        // urgent-open first, then by updatedAt
        const priorityRank: Record<TicketPriority, number> = { urgent: 0, high: 1, normal: 2, low: 3 };
        if (priorityRank[a.priority] !== priorityRank[b.priority]) {
          return priorityRank[a.priority] - priorityRank[b.priority];
        }
        return b.updatedAt - a.updatedAt;
      });
  }, [tickets, filter, search]);

  const selected = tickets.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  const send = () => {
    if (!selected || !draft.trim()) return;
    reply(selected.id, draft.trim(), isInternal);
    setDraft("");
    setIsInternal(false);
  };

  const openCount = counts.open + counts.pending;
  const breached = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed" && t.slaDueAt < Date.now()).length;
  const unassigned = tickets.filter((t) => !t.assigneeId && !t.assignee && t.status !== "closed" && t.status !== "resolved").length;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Support tickets"
        subtitle="Unified inbox across email, chat, WhatsApp, Instagram and phone."
        actions={
          <div className="flex items-center gap-2">
            <Chip tone={breached > 0 ? "red" : "green"}>
              <AlertTriangle className="h-3 w-3" /> {breached} breached
            </Chip>
            <Chip tone="neutral">
              <TicketIcon className="h-3 w-3" /> {openCount} open
            </Chip>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MiniStat label="Open tickets" value={counts.open.toString()} tone="blue" />
        <MiniStat label="Awaiting response" value={counts.pending.toString()} tone="amber" />
        <MiniStat label="Unassigned" value={unassigned.toString()} tone="purple" />
        <MiniStat label="Breached SLA" value={breached.toString()} tone={breached > 0 ? "red" : "green"} />
      </div>

      {/* Three-pane inbox */}
      <div className="grid grid-cols-12 gap-4" style={{ minHeight: 640 }}>
        {/* Left: filter list */}
        <div className="col-span-12 lg:col-span-4 xl:col-span-3">
          <Card padded={false} className="h-full flex flex-col">
            <div className="p-3 border-b border-black/[0.06] space-y-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tickets, customers, orders…"
                  className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px]"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {(["all", "open", "pending", "on_hold", "resolved", "closed"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`text-[11px] px-2 py-1 rounded-md border ${
                      filter === s
                        ? "bg-ink text-white border-ink"
                        : "bg-white text-ink border-black/10 hover:bg-black/[0.04]"
                    }`}
                  >
                    {s === "all" ? "All" : STATUS_LABEL[s]} · {counts[s]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-black/[0.06]">
              {filtered.length === 0 && (
                <div className="p-6 text-center text-[13px] text-muted-foreground">No tickets match.</div>
              )}
              {filtered.map((t) => {
                const active = t.id === selected?.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => select(t.id)}
                    className={`w-full text-left p-3 hover:bg-black/[0.03] ${
                      active ? "bg-black/[0.04]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="text-[11px] font-sans text-muted-foreground">{t.number}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">{CHANNEL_ICON[t.channel]}</span>
                        <Chip tone={PRIORITY_TONE[t.priority]}>{t.priority}</Chip>
                      </div>
                    </div>
                    <div className="text-[13px] text-ink font-medium truncate">{t.subject}</div>
                    <div className="text-[12px] text-muted-foreground truncate">{t.customerName}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <Chip tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Chip>
                      <div className="text-[11px] text-muted-foreground">{timeAgo(t.updatedAt)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Middle: conversation */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-6">
          <Card padded={false} className="h-full flex flex-col">
            {selected ? (
              <>
                <div className="p-4 border-b border-black/[0.06]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-sans text-muted-foreground">{selected.number}</span>
                        <Chip tone={STATUS_TONE[selected.status]}>{STATUS_LABEL[selected.status]}</Chip>
                        <Chip tone={PRIORITY_TONE[selected.priority]}>{selected.priority}</Chip>
                        {slaBadge(selected)}
                      </div>
                      <h2 className="font-display text-lg font-semibold text-ink truncate">{selected.subject}</h2>
                      <div className="flex items-center gap-3 text-[12px] text-muted-foreground mt-0.5">
                        <span className="inline-flex items-center gap-1">{CHANNEL_ICON[selected.channel]} {CHANNEL_LABEL[selected.channel]}</span>
                        <span>·</span>
                        <span>Opened {timeAgo(selected.createdAt)}</span>
                        {selected.orderRef && (
                          <>
                            <span>·</span>
                            <span className="font-sans">Order {selected.orderRef}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusButton current={selected.status} target="resolved" onClick={() => setStatus(selected.id, "resolved")} icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resolve" />
                      <StatusButton current={selected.status} target="on_hold" onClick={() => setStatus(selected.id, "on_hold")} icon={<PauseCircle className="h-3.5 w-3.5" />} label="Hold" />
                      <StatusButton current={selected.status} target="closed" onClick={() => setStatus(selected.id, "closed")} icon={<XCircle className="h-3.5 w-3.5" />} label="Close" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/[0.02]">
                  {selected.messages.map((m) => {
                    const isAgent = m.author === "agent";
                    const isSystem = m.author === "system";
                    if (isSystem) {
                      return (
                        <div key={m.id} className="text-center">
                          <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-black/[0.04]">
                            {m.body} · {timeAgo(m.at)}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={m.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] shadow-sm ${
                            isAgent
                              ? m.internal
                                ? "bg-amber-50 border border-amber-200 text-ink rounded-br-md"
                                : "bg-ink text-white rounded-br-md"
                              : "bg-white border border-black/10 text-ink rounded-bl-md"
                          }`}
                        >
                          <div className={`text-[11px] mb-1 ${isAgent && !m.internal ? "text-white/60" : "text-muted-foreground"}`}>
                            {m.authorName} · {timeAgo(m.at)}
                            {m.internal && <span className="ml-1 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> internal</span>}
                          </div>
                          <div className="whitespace-pre-wrap">{m.body}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 border-t border-black/[0.06] bg-white">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setIsInternal(false)}
                      className={`text-[11px] px-2 py-1 rounded-md border ${!isInternal ? "bg-ink text-white border-ink" : "bg-white text-ink border-black/10"}`}
                    >
                      Reply to customer
                    </button>
                    <button
                      onClick={() => setIsInternal(true)}
                      className={`text-[11px] px-2 py-1 rounded-md border inline-flex items-center gap-1 ${isInternal ? "bg-amber-100 text-amber-800 border-amber-200" : "bg-white text-ink border-black/10"}`}
                    >
                      <Lock className="h-3 w-3" /> Internal note
                    </button>
                    <div className="ml-auto text-[11px] text-muted-foreground">Ctrl + Enter to send</div>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); send(); }
                    }}
                    rows={3}
                    placeholder={isInternal ? "Add an internal note visible only to the team…" : "Write a reply to the customer…"}
                    className="w-full text-[13px] px-3 py-2 rounded-md border border-black/10 bg-white resize-none focus:outline-none focus:border-black/30"
                  />
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-[11px] text-muted-foreground">
                      Templates: <button onClick={() => setDraft("Thanks for reaching out - we're on it and will update you within the hour.")} className="underline">Acknowledge</button> · <button onClick={() => setDraft("Your refund has been initiated. It should reflect within 3 - 5 working days.")} className="underline">Refund note</button>
                    </div>
                    <button
                      onClick={send}
                      disabled={!draft.trim()}
                      className="h-8 px-3 rounded-md bg-ink text-white text-[12px] inline-flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Send className="h-3.5 w-3.5" /> Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 grid place-items-center text-[13px] text-muted-foreground">Select a ticket to view.</div>
            )}
          </Card>
        </div>

        {/* Right: details */}
        <div className="col-span-12 lg:col-span-3 xl:col-span-3">
          <Card className="h-full">
            {selected ? (
              <div className="space-y-5">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Customer</div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-black/[0.06] grid place-items-center text-[13px] font-semibold text-ink">
                      {selected.customerName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] text-ink font-medium truncate">{selected.customerName}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{selected.customerEmail}</div>
                    </div>
                  </div>
                  <a href="/customers" className="mt-2 inline-flex items-center gap-1 text-[12px] text-ink underline underline-offset-4">
                    View profile <ArrowRight className="h-3 w-3" />
                  </a>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Assignee</div>
                  <select
                    value={selected.assigneeId ?? ""}
                    onChange={(e) => {
                      const adminId = e.target.value || null;
                      const name = agents.find((a) => a.id === adminId)?.name;
                      void assign(selected.id, adminId, name);
                    }}
                    className="w-full h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
                  >
                    <option value="">Unassigned</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Priority</div>
                  <div className="grid grid-cols-4 gap-1">
                    {(["low", "normal", "high", "urgent"] as TicketPriority[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(selected.id, p)}
                        className={`text-[11px] px-2 py-1 rounded-md border capitalize ${
                          selected.priority === p
                            ? "bg-ink text-white border-ink"
                            : "bg-white text-ink border-black/10 hover:bg-black/[0.04]"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {selected.tags.length === 0 && <span className="text-[12px] text-muted-foreground">No tags</span>}
                    {selected.tags.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.05] text-ink inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border-t border-black/[0.06] pt-4">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">Timeline</div>
                  <div className="space-y-2 text-[12px]">
                    <TimelineRow icon={<TicketIcon className="h-3 w-3" />} label="Opened" value={timeAgo(selected.createdAt)} />
                    {selected.firstResponseAt && (
                      <TimelineRow icon={<Send className="h-3 w-3" />} label="First response" value={timeAgo(selected.firstResponseAt)} />
                    )}
                    <TimelineRow icon={<Clock className="h-3 w-3" />} label="Last update" value={timeAgo(selected.updatedAt)} />
                    <TimelineRow icon={<AlertTriangle className="h-3 w-3" />} label="SLA due" value={new Date(selected.slaDueAt).toLocaleString()} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[13px] text-muted-foreground">Select a ticket to see details.</div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone: "green" | "amber" | "red" | "blue" | "purple" }) {
  const bg: Record<string, string> = {
    green: "bg-ink text-white border-ink",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    red: "bg-rose-50 text-rose-700 border-rose-200",
    blue: "bg-sky-50 text-sky-700 border-sky-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <Card className={`!p-4 border ${bg[tone]}`}>
      <div className="text-[12px]">{label}</div>
      <div className="font-display text-[22px] font-bold mt-1">{value}</div>
    </Card>
  );
}

function StatusButton({
  current, target, onClick, icon, label,
}: { current: TicketStatus; target: TicketStatus; onClick: () => void; icon: React.ReactNode; label: string }) {
  const active = current === target;
  return (
    <button
      onClick={onClick}
      title={label}
      className={`h-8 px-2.5 text-[11px] inline-flex items-center gap-1 rounded-md border ${
        active ? "bg-ink text-white border-ink" : "bg-white text-ink border-black/10 hover:bg-black/[0.04]"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function TimelineRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span>{icon}</span>
      <span className="text-ink">{label}:</span>
      <span className="ml-auto">{value}</span>
    </div>
  );
}

// silence unused
void User;
