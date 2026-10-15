import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PageHeader } from "./AdminShell";
import { Card, Chip, naira } from "./ui";
import {
  useConciergeRequests,
  type ConciergeRequest,
  type ConciergeStatus,
  type ConciergePriority,
} from "@/lib/concierge-requests-store";
import { AlertTriangle, Clock, Crown, Search, User2, GripVertical } from "lucide-react";

const COLUMNS: { id: ConciergeStatus; label: string; tone: string }[] = [
  { id: "New",        label: "New",         tone: "bg-slate-100 text-slate-700" },
  { id: "Sourcing",   label: "Sourcing",    tone: "bg-amber-100 text-amber-800" },
  { id: "Quoted",     label: "Quoted",      tone: "bg-violet-100 text-violet-800" },
  { id: "Approved",   label: "Approved",    tone: "bg-muted text-ink" },
  { id: "Ordered",    label: "Ordered",     tone: "bg-sky-100 text-sky-800" },
  { id: "In Transit", label: "In Transit",  tone: "bg-blue-100 text-blue-800" },
  { id: "Delivered",  label: "Delivered",   tone: "bg-green-100 text-green-800" },
];

function slaBadge(dueAt: number) {
  const diffH = (dueAt - Date.now()) / 3_600_000;
  if (diffH < 0) return { tone: "red" as const, label: `${Math.abs(Math.round(diffH))}h overdue`, icon: AlertTriangle };
  if (diffH < 12) return { tone: "amber" as const, label: `${Math.round(diffH)}h left`, icon: Clock };
  return { tone: "slate" as const, label: `${Math.round(diffH)}h left`, icon: Clock };
}

const priTone: Record<ConciergePriority, "red" | "amber" | "slate"> = {
  VIP: "red",
  Priority: "amber",
  Standard: "slate",
};

export function SourcingBoard() {
  const requests = useConciergeRequests((s) => s.requests);
  const agentNames = useConciergeRequests((s) => s.agents.map((a) => a.name));
  const hydrate = useConciergeRequests((s) => s.hydrate);
  const setStatus = useConciergeRequests((s) => s.setStatus);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [q, setQ] = useState("");
  const [agent, setAgent] = useState<string>("all");
  const [priority, setPriority] = useState<"all" | ConciergePriority>("all");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ConciergeStatus | null>(null);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (r.status === "Cancelled") return false;
      if (agent !== "all" && (r.assignee || "Unassigned") !== agent) return false;
      if (priority !== "all" && r.priority !== priority) return false;
      if (q) {
        const t = q.toLowerCase();
        if (
          !r.id.toLowerCase().includes(t) &&
          !r.customer.name.toLowerCase().includes(t) &&
          !r.brand.toLowerCase().includes(t) &&
          !r.itemName.toLowerCase().includes(t)
        )
          return false;
      }
      return true;
    });
  }, [requests, q, agent, priority]);

  const byCol = useMemo(() => {
    const m: Record<ConciergeStatus, ConciergeRequest[]> = {
      New: [], Sourcing: [], Quoted: [], Approved: [],
      Ordered: [], "In Transit": [], Delivered: [], Cancelled: [],
      "Payment Pending": [], Unavailable: [],
    };
    filtered.forEach((r) => m[r.status].push(r));
    return m;
  }, [filtered]);

  const pipelineValue = filtered
    .filter((r) => !["Delivered"].includes(r.status))
    .reduce((n, r) => n + (r.quote?.amount ?? r.budget), 0);

  const breached = filtered.filter((r) => r.slaDueAt < Date.now()).length;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Sourcing Board"
        subtitle="Drag requests across the pipeline. Live SLA and agent load."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Active requests</div>
          <div className="font-display text-2xl font-bold mt-1">{filtered.length}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Pipeline value</div>
          <div className="font-display text-2xl font-bold mt-1">{naira(pipelineValue)}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">SLA breached</div>
          <div className="font-display text-2xl font-bold mt-1 text-rose-600">{breached}</div>
        </Card>
        <Card className="!p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Unassigned</div>
          <div className="font-display text-2xl font-bold mt-1">
            {filtered.filter((r) => !r.assignee).length}
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px] max-w-[360px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search id, customer, brand, item…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px]"
          />
        </div>
        <select
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All agents</option>
          <option value="Unassigned">Unassigned</option>
          {agentNames.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as typeof priority)}
          className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All priority</option>
          <option value="VIP">VIP</option>
          <option value="Priority">Priority</option>
          <option value="Standard">Standard</option>
        </select>
        <div className="ml-auto text-[12px] text-muted-foreground">
          Tip: drag a card into another column to update status.
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => {
          const items = byCol[col.id];
          const total = items.reduce((n, r) => n + (r.quote?.amount ?? r.budget), 0);
          const isOver = overCol === col.id;
          return (
            <div
              key={col.id}
              onDragOver={(e) => { e.preventDefault(); setOverCol(col.id); }}
              onDragLeave={() => setOverCol((c) => (c === col.id ? null : c))}
              onDrop={() => {
                if (dragId) setStatus(dragId, col.id);
                setDragId(null);
                setOverCol(null);
              }}
              className={`shrink-0 w-[300px] rounded-xl border transition-colors ${
                isOver ? "border-gold bg-gold/5" : "border-black/[0.06] bg-black/[0.02]"
              }`}
            >
              <div className="px-3 py-2.5 flex items-center justify-between border-b border-black/[0.06]">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${col.tone}`}>
                    {col.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="text-[10px] text-muted-foreground tabular-nums">{naira(total)}</div>
              </div>

              <div className="p-2 space-y-2 min-h-[120px]">
                {items.length === 0 && (
                  <div className="text-center text-[11px] text-muted-foreground py-8">
                    No requests
                  </div>
                )}
                {items.map((r) => {
                  const sla = slaBadge(r.slaDueAt);
                  const SlaIcon = sla.icon;
                  return (
                    <div
                      key={r.id}
                      draggable
                      onDragStart={() => setDragId(r.id)}
                      onDragEnd={() => { setDragId(null); setOverCol(null); }}
                      className={`group bg-white rounded-lg border border-black/[0.08] p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        dragId === r.id ? "opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <Link
                          to="/concierge/inbox"
                          className="font-sans text-[10px] text-muted-foreground hover:text-ink"
                        >
                          {r.id}
                        </Link>
                        <GripVertical className="h-3.5 w-3.5 text-black/20 opacity-0 group-hover:opacity-100" />
                      </div>
                      <div className="text-[12px] font-semibold text-ink leading-tight">
                        {r.brand}
                      </div>
                      <div className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {r.itemName}
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <Chip tone={priTone[r.priority]}>
                          {r.priority === "VIP" && <Crown className="h-2.5 w-2.5" />}
                          {r.priority}
                        </Chip>
                        <Chip tone={sla.tone}>
                          <SlaIcon className="h-2.5 w-2.5" />
                          {sla.label}
                        </Chip>
                      </div>
                      <div className="mt-2 pt-2 border-t border-black/[0.05] flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-muted-foreground truncate">
                          <User2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{r.assignee ?? "Unassigned"}</span>
                        </div>
                        <div className="font-semibold text-ink tabular-nums">
                          {naira(r.quote?.amount ?? r.budget)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
