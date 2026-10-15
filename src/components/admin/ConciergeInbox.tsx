import { useEffect, useMemo, useState } from "react";
import {
  Search, Sparkles, Clock, AlertTriangle, User, Send, Crown,
  DollarSign, ArrowUpRight, MessageSquare, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, StatusPill, naira, Empty } from "./ui";
import {
  useConciergeRequests,
  type ConciergeRequest, type ConciergeStatus, type ConciergePriority,
} from "@/lib/concierge-requests-store";

const STATUSES: ConciergeStatus[] = [
  "New", "Sourcing", "Quoted", "Approved", "Ordered", "In Transit", "Delivered", "Cancelled",
];
const PRIORITIES: ConciergePriority[] = ["Standard", "Priority", "VIP"];

function fmtRel(ms: number) {
  const diff = Date.now() - ms;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ${diff < 0 ? "left" : "ago"}`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ${diff < 0 ? "left" : "ago"}`;
  const days = Math.round(hrs / 24);
  return `${days}d ${diff < 0 ? "left" : "ago"}`;
}

function slaTone(dueAt: number, status: ConciergeStatus) {
  if (status === "Delivered" || status === "Cancelled") return "slate" as const;
  const left = dueAt - Date.now();
  if (left < 0) return "red" as const;
  if (left < 6 * 3_600_000) return "amber" as const;
  return "green" as const;
}

function priorityTone(p: ConciergePriority) {
  if (p === "VIP") return "gold" as const;
  if (p === "Priority") return "purple" as const;
  return "neutral" as const;
}

export function ConciergeInbox() {
  const requests = useConciergeRequests((s) => s.requests);
  const agents = useConciergeRequests((s) => s.agents);
  const agentNames = agents.map((a) => a.name);
  const hydrate = useConciergeRequests((s) => s.hydrate);
  const assign = useConciergeRequests((s) => s.assign);
  const setStatus = useConciergeRequests((s) => s.setStatus);
  const addNote = useConciergeRequests((s) => s.addNote);
  const addQuote = useConciergeRequests((s) => s.addQuote);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"All" | ConciergeStatus>("All");
  const [priorityF, setPriorityF] = useState<"all" | ConciergePriority>("all");
  const [assigneeF, setAssigneeF] = useState<"all" | "unassigned" | string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(requests[0]?.id ?? null);
  const [noteDraft, setNoteDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: requests.length };
    for (const r of requests) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [requests]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return requests
      .filter((r) => {
        if (tab !== "All" && r.status !== tab) return false;
        if (priorityF !== "all" && r.priority !== priorityF) return false;
        if (assigneeF === "unassigned" && r.assignee) return false;
        if (assigneeF !== "all" && assigneeF !== "unassigned" && r.assignee !== assigneeF) return false;
        if (!term) return true;
        return (
          r.id.toLowerCase().includes(term) ||
          r.itemName.toLowerCase().includes(term) ||
          r.brand.toLowerCase().includes(term) ||
          r.customer.name.toLowerCase().includes(term) ||
          r.customer.email.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const pa = PRIORITIES.indexOf(a.priority);
        const pb = PRIORITIES.indexOf(b.priority);
        if (pa !== pb) return pb - pa;
        return a.slaDueAt - b.slaDueAt;
      });
  }, [requests, q, tab, priorityF, assigneeF]);

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null;

  const slaBreached = requests.filter(
    (r) => r.slaDueAt < Date.now() && r.status !== "Delivered" && r.status !== "Cancelled",
  ).length;
  const unassigned = requests.filter((r) => !r.assignee && r.status !== "Cancelled").length;
  const vipOpen = requests.filter(
    (r) => r.priority === "VIP" && r.status !== "Delivered" && r.status !== "Cancelled",
  ).length;
  const pipelineValue = requests
    .filter((r) => r.status !== "Cancelled" && r.status !== "Delivered")
    .reduce((n, r) => n + (r.quote?.amount ?? r.budget), 0);

  const submitNote = () => {
    if (!selected || !noteDraft.trim()) return;
    addNote(selected.id, "You", noteDraft.trim());
    setNoteDraft("");
  };
  const submitQuote = () => {
    if (!selected) return;
    const amt = parseInt(quoteDraft.replace(/\D/g, ""), 10);
    if (!amt) return;
    addQuote(selected.id, amt, 30);
    setQuoteDraft("");
  };

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      <PageHeader
        title="Concierge Requests"
        subtitle={`${filtered.length} of ${requests.length} requests · ${naira(pipelineValue)} pipeline`}
        actions={
          <>
            <button
              onClick={() => alert("New manual request drawer coming soon.")}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] flex items-center gap-1.5 hover:bg-black/[0.04]"
            >
              <Sparkles className="h-3.5 w-3.5" /> Log manual request
            </button>
            <button
              onClick={() => alert("Prototype: SLA rules editor.")}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium hover:opacity-90"
            >
              SLA rules
            </button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "SLA breached", value: slaBreached, tone: "red" as const, hint: "Past due · act now" },
          { label: "Unassigned", value: unassigned, tone: "amber" as const, hint: "Needs an agent" },
          { label: "VIP open", value: vipOpen, tone: "gold" as const, hint: "Platinum & Gold" },
          { label: "Pipeline value", value: naira(pipelineValue), tone: "purple" as const, hint: "Open + quoted" },
        ].map((k) => (
          <Card key={k.label} className="!p-4">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <div className="font-display text-2xl font-bold">{k.value}</div>
              <Chip tone={k.tone}>live</Chip>
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">{k.hint}</div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="flex items-center gap-1 bg-white border border-black/10 rounded-lg p-1 overflow-x-auto">
          {(["All", ...STATUSES] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[12px] px-2.5 h-7 rounded-md font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                tab === t ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
              }`}
            >
              {t}
              <span className={`text-[10px] px-1.5 rounded-full ${tab === t ? "bg-white/20" : "bg-black/[0.05]"}`}>
                {counts[t] ?? 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search request, brand, customer…"
            className="h-9 pl-8 pr-3 w-[260px] rounded-md bg-white border border-black/10 text-[13px] focus:outline-none focus:border-ink"
          />
        </div>
        <select
          value={priorityF}
          onChange={(e) => setPriorityF(e.target.value as typeof priorityF)}
          className="h-9 px-2 rounded-md bg-white border border-black/10 text-[12.5px]"
        >
          <option value="all">All priorities</option>
          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={assigneeF}
          onChange={(e) => setAssigneeF(e.target.value)}
          className="h-9 px-2 rounded-md bg-white border border-black/10 text-[12.5px]"
        >
          <option value="all">All agents</option>
          <option value="unassigned">Unassigned</option>
          {agentNames.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4">
        {/* List */}
        <div className="bg-white border border-black/[0.06] rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
          <div className="max-h-[calc(100vh-320px)] overflow-y-auto divide-y divide-black/[0.06]">
            {filtered.length === 0 && <Empty title="No requests match" sub="Adjust filters or search." />}
            {filtered.map((r) => {
              const isActive = selected?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-4 py-3 flex gap-3 items-start hover:bg-black/[0.02] transition-colors ${
                    isActive ? "bg-gold/5 border-l-2 border-gold" : "border-l-2 border-transparent"
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-black/[0.06] grid place-items-center shrink-0 text-[12px] font-semibold">
                    {r.customer.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-[13px] truncate">{r.customer.name}</span>
                      {r.customer.tier !== "Guest" && r.customer.tier !== "Member" && (
                        <Crown className="h-3 w-3 text-gold shrink-0" />
                      )}
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-auto">{r.id.slice(-5)}</span>
                    </div>
                    <div className="text-[12.5px] text-ink truncate">
                      <span className="font-semibold">{r.brand}</span> · {r.itemName}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <StatusPill status={r.status} />
                      <Chip tone={priorityTone(r.priority)}>{r.priority}</Chip>
                      <Chip tone={slaTone(r.slaDueAt, r.status)}>
                        <Clock className="h-2.5 w-2.5" /> {fmtRel(r.slaDueAt)}
                      </Chip>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail */}
        {selected ? (
          <RequestDetail
            key={selected.id}
            req={selected}
            agentNames={agentNames}
            onAssign={(a) => assign(selected.id, a)}
            onStatus={(s) => setStatus(selected.id, s)}
            noteDraft={noteDraft}
            setNoteDraft={setNoteDraft}
            submitNote={submitNote}
            quoteDraft={quoteDraft}
            setQuoteDraft={setQuoteDraft}
            submitQuote={submitQuote}
          />
        ) : (
          <Card><Empty title="Select a request" sub="Pick one from the list to view details." /></Card>
        )}
      </div>
    </div>
  );
}

function RequestDetail({
  req, agentNames, onAssign, onStatus,
  noteDraft, setNoteDraft, submitNote,
  quoteDraft, setQuoteDraft, submitQuote,
}: {
  req: ConciergeRequest;
  agentNames: string[];
  onAssign: (a: string) => void;
  onStatus: (s: ConciergeStatus) => void;
  noteDraft: string; setNoteDraft: (v: string) => void; submitNote: () => void;
  quoteDraft: string; setQuoteDraft: (v: string) => void; submitQuote: () => void;
}) {
  const overdue = req.slaDueAt < Date.now() && req.status !== "Delivered" && req.status !== "Cancelled";

  return (
    <div className="bg-white border border-black/[0.06] rounded-xl shadow-[0_1px_2px_rgba(15,15,15,0.04)] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-black/[0.06]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="min-w-0">
            <div className="text-[11px] text-muted-foreground font-sans">{req.id}</div>
            <div className="font-display text-[20px] font-bold leading-tight">{req.itemName}</div>
            <div className="text-[13px] text-muted-foreground mt-0.5">
              {req.brand} · {req.category}{req.size ? ` · ${req.size}` : ""}{req.color ? ` · ${req.color}` : ""}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Chip tone={priorityTone(req.priority)}>{req.priority}</Chip>
            <StatusPill status={req.status} />
          </div>
        </div>
        {overdue && (
          <div className="mt-3 flex items-center gap-2 text-[12px] bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5" />
            SLA breached {fmtRel(req.slaDueAt)} - escalate now.
          </div>
        )}
      </div>

      {/* Grid facts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-black/[0.06]">
        {[
          { label: "Customer", value: req.customer.name, sub: req.customer.tier },
          { label: "Budget", value: naira(req.budget), sub: "max" },
          { label: "SLA", value: fmtRel(req.slaDueAt), sub: overdue ? "overdue" : "due" },
          { label: "Assignee", value: req.assignee ?? "Unassigned", sub: req.assignee ? "agent" : "pick one" },
        ].map((f) => (
          <div key={f.label} className="p-4 border-r border-black/[0.06] last:border-r-0">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{f.label}</div>
            <div className="text-[13.5px] font-semibold mt-0.5 truncate">{f.value}</div>
            <div className="text-[11px] text-muted-foreground">{f.sub}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-5 border-b border-black/[0.06] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={req.assignee ?? ""}
            onChange={(e) => onAssign(e.target.value)}
            className="h-8 px-2 rounded-md border border-black/10 text-[12.5px] bg-white"
          >
            <option value="">Unassigned</option>
            {agentNames.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={req.status}
            onChange={(e) => onStatus(e.target.value as ConciergeStatus)}
            className="h-8 px-2 rounded-md border border-black/10 text-[12.5px] bg-white"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <button
          onClick={() => alert(`Prototype: message ${req.customer.name} on WhatsApp.`)}
          className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12.5px] flex items-center gap-1.5 hover:bg-black/5"
        >
          <MessageSquare className="h-3.5 w-3.5" /> Message
        </button>
        <button
          onClick={() => onStatus("Delivered")}
          className="h-8 px-3 rounded-md bg-ink text-white text-[12.5px] flex items-center gap-1.5 hover:opacity-90"
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Mark delivered
        </button>
      </div>

      {/* Notes */}
      {req.notes && (
        <div className="px-5 py-4 border-b border-black/[0.06] bg-black/[0.015]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Client brief</div>
          <div className="text-[13px] text-ink italic">"{req.notes}"</div>
          {req.reference && (
            <div className="text-[11.5px] text-muted-foreground mt-1">Ref: {req.reference}</div>
          )}
        </div>
      )}

      {/* Quote */}
      <div className="px-5 py-4 border-b border-black/[0.06]">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Quote</div>
          {req.quote && <Chip tone="green">Sent · expires {fmtRel(req.quote.expiresAt)}</Chip>}
        </div>
        {req.quote ? (
          <div className="flex items-baseline gap-4">
            <div>
              <div className="font-display text-2xl font-bold">{naira(req.quote.amount)}</div>
              <div className="text-[11px] text-muted-foreground">Total quoted</div>
            </div>
            <div>
              <div className="text-[15px] font-semibold text-gold">{naira(req.quote.deposit)}</div>
              <div className="text-[11px] text-muted-foreground">30% deposit</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <DollarSign className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={quoteDraft}
                onChange={(e) => setQuoteDraft(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter quote amount"
                className="h-9 pl-8 pr-3 w-full rounded-md border border-black/10 text-[13px]"
              />
            </div>
            <button
              onClick={submitQuote}
              disabled={!quoteDraft}
              className="h-9 px-4 rounded-md bg-gold text-white text-[13px] font-semibold hover:opacity-90 disabled:opacity-40"
            >
              Send quote
            </button>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="px-5 py-4">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">Activity</div>
        <div className="space-y-3 mb-4">
          {[...req.timeline].reverse().map((t, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-6 w-6 rounded-full bg-black/[0.05] grid place-items-center shrink-0 mt-0.5">
                {t.kind === "quote" && <DollarSign className="h-3 w-3 text-gold" />}
                {t.kind === "status" && <ArrowUpRight className="h-3 w-3 text-ink" />}
                {t.kind === "note" && <MessageSquare className="h-3 w-3 text-ink" />}
                {t.kind === "message" && <Send className="h-3 w-3 text-ink" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] text-ink">{t.text}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t.by} · {fmtRel(t.at)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitNote(); }}
            placeholder="Add internal note…"
            className="h-9 flex-1 px-3 rounded-md border border-black/10 text-[13px]"
          />
          <button
            onClick={submitNote}
            disabled={!noteDraft.trim()}
            className="h-9 w-9 grid place-items-center rounded-md bg-ink text-white disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
