import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search, Plus, Pin, PinOff, Copy, Trash2, Download, Users, TrendingUp, Mail, Filter as FilterIcon,
  X, ChevronDown, Edit3, ExternalLink, Sparkles, Layers, Send, Ticket,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, IconButton, Toolbar, Empty, naira } from "./ui";
import {
  useSegments, matchSegment, segmentStats, customerCountry,
  RULE_FIELDS, TIER_OPTIONS, STATUS_OPTIONS, COUNTRY_OPTIONS, TAG_OPTIONS,
  type Segment, type SegmentRule,
} from "@/lib/segments-store";
import { useCustomers, type CustomerTier, type CustomerStatus } from "@/lib/customers-store";
import { downloadCSV } from "@/lib/admin-export";

const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;
const fmtShort = (n: number) => n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n}`;

function Kpi({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub?: string; icon: any; accent?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
          <div className="font-display text-[24px] leading-tight mt-1">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className="h-9 w-9 grid place-items-center rounded-lg" style={{ background: (accent || "#B8862B") + "22", color: accent || "#8a6a1c" }}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function ruleLabel(r: SegmentRule): string {
  const field = RULE_FIELDS.find((f) => f.id === r.field)?.label || r.field;
  switch (r.field) {
    case "spend": case "aov": return `${field} ${r.op === "gte" ? "≥" : "≤"} ${fmtShort(r.value)}`;
    case "orders": case "concierge": return `${field} ${r.op === "gte" ? "≥" : "≤"} ${r.value}`;
    case "tier": return `Tier: ${r.value.join(", ")}`;
    case "status": return `Status: ${r.value.join(", ")}`;
    case "country": return `Country: ${r.value.join(", ")}`;
    case "city": return `City contains "${r.value}"`;
    case "tags": return `Tag ∈ ${r.value.join(", ")}`;
    case "marketingOptIn": return `Marketing ${r.value ? "opt-in" : "opt-out"}`;
    case "lastOrderAt": return `Last order ${r.op === "within_days" ? "≤" : ">"} ${r.value} days`;
    case "createdAt": return `Joined ${r.op === "within_days" ? "≤" : ">"} ${r.value} days ago`;
  }
}

// ============ Rule editor ============
function RuleEditor({ rule, onChange, onRemove }: { rule: SegmentRule; onChange: (r: SegmentRule) => void; onRemove: () => void }) {
  const meta = RULE_FIELDS.find((f) => f.id === rule.field)!;

  function setField(id: SegmentRule["field"]) {
    const m = RULE_FIELDS.find((f) => f.id === id)!;
    let next: SegmentRule;
    switch (m.kind) {
      case "money": case "number": next = { field: id, op: "gte", value: 0 } as SegmentRule; break;
      case "days": next = { field: id, op: "within_days", value: 30 } as SegmentRule; break;
      case "tierList": next = { field: "tier", op: "in", value: ["Signature"] }; break;
      case "statusList": next = { field: "status", op: "in", value: ["active"] }; break;
      case "countryList": next = { field: "country", op: "in", value: ["Nigeria"] }; break;
      case "tagList": next = { field: "tags", op: "in", value: ["fashion"] }; break;
      case "bool": next = { field: "marketingOptIn", op: "eq", value: true }; break;
      case "text": next = { field: "city", op: "contains", value: "" }; break;
    }
    onChange(next);
  }

  const inputCls = "h-9 px-2 rounded-lg border border-black/10 bg-white text-sm";

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-black/[0.03] border border-black/5">
      <select className={inputCls} value={rule.field} onChange={(e) => setField(e.target.value as any)}>
        {RULE_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
      </select>

      {(meta.kind === "money" || meta.kind === "number") && (
        <>
          <select className={inputCls} value={(rule as any).op} onChange={(e) => onChange({ ...(rule as any), op: e.target.value })}>
            <option value="gte">is at least</option>
            <option value="lte">is at most</option>
          </select>
          <input type="number" className={`${inputCls} w-32`} value={(rule as any).value}
            onChange={(e) => onChange({ ...(rule as any), value: Number(e.target.value) })} />
        </>
      )}
      {meta.kind === "days" && (
        <>
          <select className={inputCls} value={(rule as any).op} onChange={(e) => onChange({ ...(rule as any), op: e.target.value })}>
            <option value="within_days">within last</option>
            <option value="before_days">before</option>
          </select>
          <input type="number" className={`${inputCls} w-24`} value={(rule as any).value}
            onChange={(e) => onChange({ ...(rule as any), value: Number(e.target.value) })} />
          <span className="text-xs text-muted-foreground">days</span>
        </>
      )}
      {meta.kind === "text" && (
        <input className={`${inputCls} w-48`} placeholder="e.g. Lagos" value={(rule as any).value}
          onChange={(e) => onChange({ ...(rule as any), value: e.target.value })} />
      )}
      {meta.kind === "bool" && (
        <select className={inputCls} value={String((rule as any).value)} onChange={(e) => onChange({ ...(rule as any), value: e.target.value === "true" })}>
          <option value="true">is true</option>
          <option value="false">is false</option>
        </select>
      )}
      {(meta.kind === "tierList" || meta.kind === "statusList" || meta.kind === "countryList" || meta.kind === "tagList") && (
        <MultiChips
          options={
            meta.kind === "tierList" ? TIER_OPTIONS :
            meta.kind === "statusList" ? STATUS_OPTIONS :
            meta.kind === "countryList" ? COUNTRY_OPTIONS : TAG_OPTIONS
          }
          value={(rule as any).value as string[]}
          onChange={(v) => onChange({ ...(rule as any), value: v })}
        />
      )}

      <button className="ml-auto p-1.5 rounded-md hover:bg-black/5 text-muted-foreground" onClick={onRemove} aria-label="Remove rule">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function MultiChips({ options, value, onChange }: { options: readonly string[]; value: string[]; onChange: (v: string[]) => void }) {
  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} onClick={() => toggle(o)}
            className={`text-[11px] px-2 py-0.5 rounded-full border transition ${on ? "bg-ink text-white border-ink" : "bg-white border-black/15 text-ink hover:border-ink/40"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ============ Segment drawer ============
type DrawerMode = { kind: "closed" } | { kind: "edit"; id: string } | { kind: "new" };

const BLANK: Omit<Segment, "id" | "createdAt" | "updatedAt" | "system"> = {
  name: "Untitled segment",
  description: "",
  color: "#B8862B",
  match: "all",
  rules: [{ field: "spend", op: "gte", value: 500_000 }],
  pinned: false,
};

function SegmentDrawer({ mode, onClose }: { mode: DrawerMode; onClose: () => void }) {
  const segments = useSegments((s) => s.segments);
  const create = useSegments((s) => s.create);
  const update = useSegments((s) => s.update);
  const customers = useCustomers((s) => s.customers);

  const existing = mode.kind === "edit" ? segments.find((s) => s.id === mode.id) : null;
  const [draft, setDraft] = useState<Omit<Segment, "id" | "createdAt" | "updatedAt" | "system">>(
    existing ? { name: existing.name, description: existing.description, color: existing.color, match: existing.match, rules: existing.rules, pinned: existing.pinned } : BLANK
  );

  if (mode.kind === "closed") return null;

  const stats = segmentStats(customers, draft);
  const readonly = mode.kind === "edit" && existing?.system;

  function save() {
    if (mode.kind === "new") create(draft);
    else if (mode.kind === "edit") update(mode.id, draft);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-[640px] bg-white h-full flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-black/5 flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg grid place-items-center" style={{ background: draft.color + "22", color: draft.color }}>
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
              {mode.kind === "new" ? "New segment" : existing?.system ? "System segment" : "Edit segment"}
            </div>
            <div className="font-display text-lg leading-tight">{draft.name || "Untitled"}</div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md hover:bg-black/5"><X className="h-4 w-4" /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-5">
          {readonly && (
            <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              This is a system preset. Duplicate it to make changes.
            </div>
          )}

          <div className="grid grid-cols-[1fr_120px] gap-3">
            <div>
              <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Name</label>
              <input className="w-full h-10 px-3 rounded-lg border border-black/10 mt-1 text-sm" value={draft.name}
                disabled={!!readonly}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Accent</label>
              <input type="color" className="w-full h-10 rounded-lg border border-black/10 mt-1 bg-white" value={draft.color}
                disabled={!!readonly}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Description</label>
            <textarea rows={2} className="w-full mt-1 px-3 py-2 rounded-lg border border-black/10 text-sm resize-none" value={draft.description}
              disabled={!!readonly}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Rules</label>
              <div className="inline-flex rounded-md border border-black/10 overflow-hidden text-xs">
                {(["all", "any"] as const).map((m) => (
                  <button key={m} disabled={!!readonly}
                    className={`px-3 py-1 ${draft.match === m ? "bg-ink text-white" : "bg-white"}`}
                    onClick={() => setDraft({ ...draft, match: m })}>
                    Match {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {draft.rules.map((r, i) => (
                <RuleEditor key={i} rule={r}
                  onChange={(nr) => !readonly && setDraft({ ...draft, rules: draft.rules.map((x, j) => (j === i ? nr : x)) })}
                  onRemove={() => !readonly && setDraft({ ...draft, rules: draft.rules.filter((_, j) => j !== i) })} />
              ))}
              {!readonly && (
                <button onClick={() => setDraft({ ...draft, rules: [...draft.rules, { field: "spend", op: "gte", value: 100_000 }] })}
                  className="w-full h-10 rounded-lg border border-dashed border-black/15 text-sm text-muted-foreground hover:border-ink/40 hover:text-ink inline-flex items-center justify-center gap-1.5">
                  <Plus className="h-4 w-4" /> Add rule
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-2 block">Live preview</label>
            <div className="grid grid-cols-4 gap-2">
              <div className="p-3 rounded-lg bg-black/[0.03]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Matches</div>
                <div className="font-display text-lg">{stats.count}</div>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.03]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Share</div>
                <div className="font-display text-lg">{fmtPct(stats.share)}</div>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.03]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Spend</div>
                <div className="font-display text-lg">{fmtShort(stats.spend)}</div>
              </div>
              <div className="p-3 rounded-lg bg-black/[0.03]">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reachable</div>
                <div className="font-display text-lg">{stats.marketable}</div>
              </div>
            </div>
            <div className="mt-3 max-h-52 overflow-auto border border-black/5 rounded-lg divide-y divide-black/5">
              {stats.matched.slice(0, 20).map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <div className="h-7 w-7 rounded-full bg-ink/90 text-white text-[11px] grid place-items-center">
                    {c.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{c.email} · {customerCountry(c)}</div>
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">{naira(c.spend)}</div>
                </div>
              ))}
              {stats.matched.length === 0 && <div className="p-4 text-xs text-muted-foreground text-center">No customers match yet.</div>}
              {stats.matched.length > 20 && <div className="px-3 py-2 text-[11px] text-muted-foreground text-center">+{stats.matched.length - 20} more</div>}
            </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-black/5 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {mode.kind === "edit" && existing ? `Updated ${new Date(existing.updatedAt).toLocaleDateString()}` : "Draft not saved"}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="h-9 px-4 rounded-lg border border-black/10 text-sm hover:bg-black/5">Cancel</button>
            <button onClick={save} disabled={!!readonly || draft.rules.length === 0 || !draft.name.trim()}
              className="h-9 px-4 rounded-lg bg-ink text-white text-sm disabled:opacity-40">
              {mode.kind === "new" ? "Create segment" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Segment card ============
function SegmentCard({ seg, onOpen }: { seg: Segment; onOpen: () => void }) {
  const customers = useCustomers((s) => s.customers);
  const togglePin = useSegments((s) => s.togglePin);
  const duplicate = useSegments((s) => s.duplicate);
  const remove = useSegments((s) => s.remove);
  const [menu, setMenu] = useState(false);

  const stats = useMemo(() => segmentStats(customers, seg), [customers, seg]);

  return (
    <Card padded={false} className="overflow-hidden group">
      <div className="h-1" style={{ background: seg.color }} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg grid place-items-center shrink-0" style={{ background: seg.color + "22", color: seg.color }}>
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="font-display text-[15px] leading-tight truncate">{seg.name}</div>
              {seg.pinned && <Pin className="h-3 w-3 text-gold" />}
              {seg.system && <Chip tone="slate" className="!text-[10px]">Preset</Chip>}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{seg.description || "No description"}</div>
          </div>
          <div className="relative">
            <IconButton aria-label="menu" onClick={() => setMenu((v) => !v)}>
              <ChevronDown className="h-4 w-4" />
            </IconButton>
            {menu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-white border border-black/10 rounded-lg shadow-lg py-1 text-sm">
                  <button onClick={() => { onOpen(); setMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-black/5 flex items-center gap-2">
                    <Edit3 className="h-3.5 w-3.5" /> {seg.system ? "View" : "Edit"}
                  </button>
                  <button onClick={() => { togglePin(seg.id); setMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-black/5 flex items-center gap-2">
                    {seg.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {seg.pinned ? "Unpin" : "Pin"}
                  </button>
                  <button onClick={() => { duplicate(seg.id); setMenu(false); }} className="w-full text-left px-3 py-1.5 hover:bg-black/5 flex items-center gap-2">
                    <Copy className="h-3.5 w-3.5" /> Duplicate
                  </button>
                  {!seg.system && (
                    <button onClick={() => { if (confirm(`Delete "${seg.name}"?`)) remove(seg.id); setMenu(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-rose-600 flex items-center gap-2">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 mt-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Customers</div>
            <div className="font-display text-lg leading-tight">{stats.count}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Share</div>
            <div className="font-display text-lg leading-tight">{fmtPct(stats.share)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Spend</div>
            <div className="font-display text-lg leading-tight">{fmtShort(stats.spend)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reachable</div>
            <div className="font-display text-lg leading-tight">{stats.marketable}</div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {seg.rules.slice(0, 3).map((r, i) => (
            <Chip key={i} tone="neutral" className="!text-[10px]">{ruleLabel(r)}</Chip>
          ))}
          {seg.rules.length > 3 && <Chip tone="neutral" className="!text-[10px]">+{seg.rules.length - 3} more</Chip>}
          <Chip tone="slate" className="!text-[10px]">Match {seg.match}</Chip>
        </div>

        <div className="mt-4 pt-3 border-t border-black/5 flex items-center gap-2">
          <button onClick={onOpen} className="text-xs font-medium inline-flex items-center gap-1 hover:text-gold">
            Open <ExternalLink className="h-3 w-3" />
          </button>
          <Link to="/campaigns" className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-ink">
            <Send className="h-3 w-3" /> Campaign
          </Link>
          <Link to="/coupons" className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-ink">
            <Ticket className="h-3 w-3" /> Coupon
          </Link>
        </div>
      </div>
    </Card>
  );
}

// ============ Page ============
export function AdminSegments() {
  const segments = useSegments((s) => s.segments);
  const hydrate = useSegments((s) => s.hydrate);
  const customers = useCustomers((s) => s.customers);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "custom" | "system">("all");
  const [drawer, setDrawer] = useState<DrawerMode>({ kind: "closed" });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const list = useMemo(() => {
    return segments
      .filter((s) => filter === "all" || (filter === "pinned" ? s.pinned : filter === "system" ? s.system : !s.system))
      .filter((s) => !q || s.name.toLowerCase().includes(q.toLowerCase()) || s.description.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
  }, [segments, filter, q]);

  const totalReachable = useMemo(() => {
    const set = new Set<string>();
    segments.forEach((s) => segmentStats(customers, s).matched.forEach((c) => c.marketingOptIn && set.add(c.id)));
    return set.size;
  }, [segments, customers]);

  function exportCSV() {
    const rows = segments.map((s) => {
      const st = segmentStats(customers, s);
      return {
        id: s.id, name: s.name, match: s.match, rules: s.rules.length,
        customers: st.count, share: fmtPct(st.share), spend: st.spend, reachable: st.marketable,
        pinned: s.pinned, system: s.system, updated: s.updatedAt,
      };
    });
    downloadCSV("asl-segments.csv", rows);
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="Segments"
        subtitle="Group customers by behaviour, tier, and lifecycle to power campaigns, coupons, and concierge outreach."
        actions={
          <>
            <button onClick={exportCSV} className="h-9 px-3 rounded-lg border border-black/10 text-sm hover:bg-black/5 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setDrawer({ kind: "new" })} className="h-9 px-3 rounded-lg bg-ink text-white text-sm inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> New segment
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Segments" value={String(segments.length)} sub={`${segments.filter((s) => s.pinned).length} pinned`} icon={Layers} accent="#B8862B" />
        <Kpi label="Customers" value={String(customers.length)} sub="Across all tiers" icon={Users} accent="#0B57D0" />
        <Kpi label="Reachable" value={String(totalReachable)} sub="Marketing opt-in" icon={Mail} accent="#0F5F4A" />
        <Kpi label="System presets" value={String(segments.filter((s) => s.system).length)} sub="Curated by ASL" icon={Sparkles} accent="#7C3AED" />
      </div>

      <Toolbar>
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search segments…"
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/10 text-sm bg-white" />
        </div>
        <div className="inline-flex rounded-lg border border-black/10 overflow-hidden text-xs">
          {(["all", "pinned", "custom", "system"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 h-9 capitalize ${filter === f ? "bg-ink text-white" : "bg-white hover:bg-black/5"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-muted-foreground inline-flex items-center gap-1">
          <FilterIcon className="h-3.5 w-3.5" /> {list.length} shown
        </div>
      </Toolbar>

      {list.length === 0 ? (
        <Empty title="No segments" sub="Adjust filters or create a new segment to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((s) => (
            <SegmentCard key={s.id} seg={s} onOpen={() => setDrawer({ kind: "edit", id: s.id })} />
          ))}
        </div>
      )}

      <SegmentDrawer mode={drawer} onClose={() => setDrawer({ kind: "closed" })} />
    </div>
  );
}
