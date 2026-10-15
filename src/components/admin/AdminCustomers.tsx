import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search, Filter, Download, X, ChevronDown, ChevronUp, MoreHorizontal,
  Mail, Phone, MapPin, Crown, ShieldAlert, ShieldOff, Star, Wallet, StickyNote, Tag as TagIcon,
  Plus, Trash2, ExternalLink, Users, TrendingUp, PackageCheck,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, IconButton, TableWrap, Toolbar, Empty, StatusPill, naira } from "./ui";
import { useCustomers, type Customer, type CustomerTier, type CustomerStatus } from "@/lib/customers-store";
import { downloadCSV } from "@/lib/admin-export";

const TIERS: CustomerTier[] = ["Signature", "Gold", "Silver", "Standard"];
const TABS: Array<{ id: "all" | CustomerStatus; label: string }> = [
  { id: "all", label: "All" },
  { id: "vip", label: "VIP" },
  { id: "active", label: "Active" },
  { id: "flagged", label: "Flagged" },
  { id: "blocked", label: "Blocked" },
];

function Kpi({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: any }) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">{label}</div>
          <div className="font-display text-[24px] leading-tight mt-1">{value}</div>
          {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
        </div>
        <div className="h-9 w-9 grid place-items-center rounded-lg bg-gold/15 text-gold-deep">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function tierTone(t: CustomerTier) {
  return t === "Signature" ? "gold" : t === "Gold" ? "amber" : t === "Silver" ? "slate" : "neutral";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

type SortKey = "name" | "spend" | "orders" | "lastOrderAt" | "createdAt";

export function AdminCustomers() {
  const customers = useCustomers((s) => s.customers);
  const hydrate = useCustomers((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
  const setStatus = useCustomers((s) => s.setStatus);
  const setTier = useCustomers((s) => s.setTier);
  const toggleMarketing = useCustomers((s) => s.toggleMarketing);
  const addNote = useCustomers((s) => s.addNote);
  const removeNote = useCustomers((s) => s.removeNote);
  const addTag = useCustomers((s) => s.addTag);
  const removeTag = useCustomers((s) => s.removeTag);
  const adjustWallet = useCustomers((s) => s.adjustWallet);
  const remove = useCustomers((s) => s.remove);

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<CustomerTier | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "spend", dir: "desc" });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const [openId, setOpenId] = useState<string | null>(null);
  const active = customers.find((c) => c.id === openId) ?? null;

  const kpis = useMemo(() => {
    const total = customers.length;
    const vip = customers.filter((c) => c.status === "vip").length;
    const spend = customers.reduce((s, c) => s + c.spend, 0);
    const orders = customers.reduce((s, c) => s + c.orders, 0);
    const aov = orders > 0 ? Math.round(spend / orders) : 0;
    return { total, vip, spend, aov };
  }, [customers]);

  const filtered = useMemo(() => {
    let list = customers.slice();
    if (tab !== "all") list = list.filter((c) => c.status === tab);
    if (tierFilter !== "all") list = list.filter((c) => c.tier === tierFilter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.name, c.email, c.phone, c.city, c.country, c.id, ...c.tags].join(" ").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      const av = a[sort.key] as any;
      const bv = b[sort.key] as any;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return list;
  }, [customers, tab, tierFilter, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const allSelectedOnPage = paged.length > 0 && paged.every((c) => selection.has(c.id));

  function toggleSort(k: SortKey) {
    setSort((s) => s.key === k ? { key: k, dir: s.dir === "asc" ? "desc" : "asc" } : { key: k, dir: "desc" });
  }
  function toggleRow(id: string) {
    setSelection((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function togglePage() {
    setSelection((s) => {
      const n = new Set(s);
      if (allSelectedOnPage) paged.forEach((c) => n.delete(c.id));
      else paged.forEach((c) => n.add(c.id));
      return n;
    });
  }

  function exportCSV(scope: "filtered" | "selected" | "all") {
    const src = scope === "all" ? customers : scope === "selected"
      ? customers.filter((c) => selection.has(c.id)) : filtered;
    downloadCSV(`customers-${scope}-${Date.now()}.csv`,
      src.map((c) => ({
        id: c.id, name: c.name, email: c.email, phone: c.phone,
        city: c.city, country: c.country, tier: c.tier, status: c.status,
        orders: c.orders, concierge: c.concierge, spend: c.spend, aov: c.aov,
        wallet: c.walletBalance, loyalty: c.loyaltyPoints,
        marketing: c.marketingOptIn ? "yes" : "no",
        last_order: c.lastOrderAt, created_at: c.createdAt,
        tags: c.tags.join("|"),
      })));
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Customers"
        subtitle="Every ASL ORIGINALS shopper, concierge client and VIP in one place."
        actions={
          <>
            <button onClick={() => exportCSV(selection.size ? "selected" : "filtered")}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Download className="h-4 w-4" /> Export
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Customers" value={String(kpis.total)} sub="Total accounts" icon={Users} />
        <Kpi label="VIP" value={String(kpis.vip)} sub="Signature + Gold" icon={Crown} />
        <Kpi label="Lifetime spend" value={naira(kpis.spend)} sub="Across all clients" icon={TrendingUp} />
        <Kpi label="Average order" value={naira(kpis.aov)} sub="Blended AOV" icon={PackageCheck} />
      </div>

      <div className="mb-4 border-b border-black/10 flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const count = t.id === "all" ? customers.length : customers.filter((c) => c.status === t.id).length;
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
              className={`px-3 h-9 text-[13px] font-medium whitespace-nowrap border-b-2 -mb-px ${
                on ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}>
              {t.label} <span className="ml-1 text-[11px] text-muted-foreground">({count})</span>
            </button>
          );
        })}
      </div>

      <Toolbar>
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search name, email, phone, city, tag…"
            className="w-full h-9 pl-8 pr-3 rounded-md border border-black/10 bg-white text-[13px]"
          />
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className={`h-9 px-3 rounded-md border text-[13px] font-medium inline-flex items-center gap-1.5 ${
            showFilters || tierFilter !== "all" ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
          }`}>
          <Filter className="h-4 w-4" /> Filters
          {tierFilter !== "all" && <span className="ml-1 h-4 min-w-[16px] px-1 rounded-full bg-gold text-black text-[10px] grid place-items-center">1</span>}
        </button>
      </Toolbar>

      {showFilters && (
        <Card className="mb-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Tier</div>
              <select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value as any); setPage(1); }}
                className="h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]">
                <option value="all">All tiers</option>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <button onClick={() => setTierFilter("all")}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] hover:bg-black/[0.04] inline-flex items-center gap-1.5">
              <X className="h-4 w-4" /> Clear
            </button>
          </div>
        </Card>
      )}

      {selection.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 bg-ink text-white rounded-lg px-4 py-2.5 flex items-center gap-3 shadow-lg">
          <div className="text-[13px] font-medium">{selection.size} selected</div>
          <div className="flex-1" />
          <button onClick={() => exportCSV("selected")} className="text-[12px] px-3 h-8 rounded-md bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
          <button onClick={() => selection.forEach((id) => setStatus(id, "flagged"))}
            className="text-[12px] px-3 h-8 rounded-md bg-white/10 hover:bg-white/20 inline-flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" /> Flag
          </button>
          <button onClick={() => selection.forEach((id) => setStatus(id, "active"))}
            className="text-[12px] px-3 h-8 rounded-md bg-white/10 hover:bg-white/20">Mark active</button>
          <button onClick={() => setSelection(new Set())} className="text-[12px] px-3 h-8 rounded-md hover:bg-white/10">Clear</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Empty title="No customers match" sub="Adjust your filters or search terms." />
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-black/[0.02] text-muted-foreground text-[11px] uppercase tracking-[0.1em]">
              <tr>
                <th className="w-10 px-3 py-3">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={togglePage} />
                </th>
                <SortHeader label="Customer" k="name" sort={sort} onClick={toggleSort} />
                <th className="px-3 py-3 text-left">Location</th>
                <th className="px-3 py-3 text-left">Tier</th>
                <SortHeader label="Orders" k="orders" sort={sort} onClick={toggleSort} align="right" />
                <SortHeader label="Lifetime spend" k="spend" sort={sort} onClick={toggleSort} align="right" />
                <SortHeader label="Last order" k="lastOrderAt" sort={sort} onClick={toggleSort} />
                <th className="px-3 py-3 text-left">Status</th>
                <th className="w-10 px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} className="border-t border-black/5 hover:bg-black/[0.02] cursor-pointer" onClick={() => setOpenId(c.id)}>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selection.has(c.id)} onChange={() => toggleRow(c.id)} />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-gold/40 to-black/70 grid place-items-center text-white text-[12px] font-semibold">
                        {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-ink truncate">{c.name}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{c.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{c.city}, {c.country}</td>
                  <td className="px-3 py-3"><Chip tone={tierTone(c.tier) as any}>{c.tier}</Chip></td>
                  <td className="px-3 py-3 text-right tabular-nums">{c.orders}<span className="text-muted-foreground"> · {c.concierge}c</span></td>
                  <td className="px-3 py-3 text-right tabular-nums font-medium">{naira(c.spend)}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.orders ? fmtDate(c.lastOrderAt) : " - "}</td>
                  <td className="px-3 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-3 py-3">
                    <IconButton title="Open"><MoreHorizontal className="h-4 w-4" /></IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4 text-[12px] text-muted-foreground">
          <div>Showing {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</div>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
              className="h-8 px-3 rounded-md border border-black/10 bg-white disabled:opacity-40 hover:bg-black/[0.04]">Prev</button>
            <div className="px-2">Page {page} of {pageCount}</div>
            <button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}
              className="h-8 px-3 rounded-md border border-black/10 bg-white disabled:opacity-40 hover:bg-black/[0.04]">Next</button>
          </div>
        </div>
      )}

      {active && (
        <CustomerDrawer
          customer={active}
          onClose={() => setOpenId(null)}
          onSetStatus={(s) => setStatus(active.id, s)}
          onSetTier={(t) => setTier(active.id, t)}
          onToggleMarketing={() => toggleMarketing(active.id)}
          onAddNote={(body) => addNote(active.id, body)}
          onRemoveNote={(nid) => removeNote(active.id, nid)}
          onAddTag={(t) => addTag(active.id, t)}
          onRemoveTag={(t) => removeTag(active.id, t)}
          onAdjustWallet={(delta) => adjustWallet(active.id, delta)}
          onDelete={() => { if (confirm(`Delete ${active.name}? This cannot be undone.`)) { remove(active.id); setOpenId(null); } }}
        />
      )}
    </div>
  );
}

function SortHeader({ label, k, sort, onClick, align = "left" }:
  { label: string; k: SortKey; sort: { key: SortKey; dir: "asc" | "desc" }; onClick: (k: SortKey) => void; align?: "left" | "right" }) {
  const on = sort.key === k;
  return (
    <th className={`px-3 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button onClick={() => onClick(k)} className={`inline-flex items-center gap-1 ${on ? "text-ink" : ""} hover:text-ink`}>
        {label} {on && (sort.dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
    </th>
  );
}

function CustomerDrawer({
  customer: c, onClose,
  onSetStatus, onSetTier, onToggleMarketing,
  onAddNote, onRemoveNote, onAddTag, onRemoveTag, onAdjustWallet, onDelete,
}: {
  customer: Customer;
  onClose: () => void;
  onSetStatus: (s: CustomerStatus) => void;
  onSetTier: (t: CustomerTier) => void;
  onToggleMarketing: () => void;
  onAddNote: (body: string) => void;
  onRemoveNote: (id: string) => void;
  onAddTag: (t: string) => void;
  onRemoveTag: (t: string) => void;
  onAdjustWallet: (delta: number) => void;
  onDelete: () => void;
}) {
  const [note, setNote] = useState("");
  const [tag, setTag] = useState("");
  const [walletDelta, setWalletDelta] = useState("");

  return (
    <div className="fixed inset-0 z-40 flex" onClick={onClose}>
      <div className="flex-1 bg-black/40" />
      <aside className="w-full max-w-[520px] h-full bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white border-b border-black/5 px-5 py-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-gold/40 to-black/70 grid place-items-center text-white font-semibold">
            {c.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] leading-tight truncate">{c.name}</div>
            <div className="text-[12px] text-muted-foreground truncate">{c.id} · {fmtDate(c.createdAt)}</div>
          </div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.04]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Spend</div>
              <div className="font-display text-[16px] mt-1">{naira(c.spend)}</div>
            </div>
            <div className="rounded-lg border border-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Orders</div>
              <div className="font-display text-[16px] mt-1">{c.orders} <span className="text-muted-foreground text-[12px]">· {c.concierge} concierge</span></div>
            </div>
            <div className="rounded-lg border border-black/10 p-3">
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">AOV</div>
              <div className="font-display text-[16px] mt-1">{naira(c.aov)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Contact</div>
            <div className="rounded-lg border border-black/10 divide-y divide-black/5">
              <a href={`mailto:${c.email}`} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-black/[0.02]">
                <Mail className="h-4 w-4 text-muted-foreground" /> {c.email}
              </a>
              <a href={`tel:${c.phone}`} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-black/[0.02]">
                <Phone className="h-4 w-4 text-muted-foreground" /> {c.phone}
              </a>
              <div className="flex items-center gap-2 px-3 py-2 text-[13px]">
                <MapPin className="h-4 w-4 text-muted-foreground" /> {c.city}, {c.country}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Tier</div>
              <select value={c.tier} onChange={(e) => onSetTier(e.target.value as CustomerTier)}
                className="w-full h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]">
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1">Status</div>
              <select value={c.status} onChange={(e) => onSetStatus(e.target.value as CustomerStatus)}
                className="w-full h-9 px-2 rounded-md border border-black/10 bg-white text-[13px]">
                <option value="active">Active</option>
                <option value="vip">VIP</option>
                <option value="flagged">Flagged</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={c.marketingOptIn} onChange={onToggleMarketing} />
            Marketing opt-in (email + WhatsApp)
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Wallet & rewards</div>
            </div>
            <div className="rounded-lg border border-black/10 p-3 space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /> Wallet</span>
                <span className="font-medium tabular-nums">{naira(c.walletBalance)}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="inline-flex items-center gap-2"><Star className="h-4 w-4 text-muted-foreground" /> ASL points</span>
                <span className="font-medium tabular-nums">{c.loyaltyPoints.toLocaleString()}</span>
              </div>
              <div className="flex gap-2 pt-1">
                <input value={walletDelta} onChange={(e) => setWalletDelta(e.target.value)} placeholder="Amount (₦)"
                  className="flex-1 h-8 px-2 rounded-md border border-black/10 text-[13px]" />
                <button onClick={() => { const n = Number(walletDelta); if (!isNaN(n) && n !== 0) { onAdjustWallet(n); setWalletDelta(""); } }}
                  className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium">Credit</button>
                <button onClick={() => { const n = Number(walletDelta); if (!isNaN(n) && n !== 0) { onAdjustWallet(-n); setWalletDelta(""); } }}
                  className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-medium">Debit</button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Tags</div>
            <div className="flex flex-wrap gap-1.5">
              {c.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-black/[0.05] border border-black/10">
                  <TagIcon className="h-3 w-3" /> {t}
                  <button onClick={() => onRemoveTag(t)} className="ml-1 hover:text-rose-600"><X className="h-3 w-3" /></button>
                </span>
              ))}
              {c.tags.length === 0 && <span className="text-[12px] text-muted-foreground">No tags yet</span>}
            </div>
            <div className="flex gap-2">
              <input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Add tag…"
                className="flex-1 h-8 px-2 rounded-md border border-black/10 text-[13px]" />
              <button onClick={() => { if (tag.trim()) { onAddTag(tag.trim().toLowerCase()); setTag(""); } }}
                className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add</button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">Notes</div>
            <div className="rounded-lg border border-black/10 divide-y divide-black/5">
              {c.notes.length === 0 && <div className="px-3 py-4 text-[12px] text-muted-foreground text-center">No notes yet.</div>}
              {c.notes.map((n) => (
                <div key={n.id} className="px-3 py-2.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><StickyNote className="h-3 w-3" /> {n.author} · {fmtDate(n.at)}</span>
                    <button onClick={() => onRemoveNote(n.id)} className="hover:text-rose-600"><Trash2 className="h-3 w-3" /></button>
                  </div>
                  <div className="text-[13px] mt-1">{n.body}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add internal note…"
                className="flex-1 h-8 px-2 rounded-md border border-black/10 text-[13px]" />
              <button onClick={() => { if (note.trim()) { onAddNote(note.trim()); setNote(""); } }}
                className="h-8 px-3 rounded-md bg-ink text-white text-[12px] font-medium">Save</button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-black/5">
            <Link to="/orders" className="text-[12px] inline-flex items-center gap-1 text-muted-foreground hover:text-ink">
              View orders <ExternalLink className="h-3 w-3" />
            </Link>
            <button onClick={onDelete}
              className="h-9 px-3 rounded-md border border-rose-200 bg-rose-50 text-rose-700 text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-rose-100">
              <ShieldOff className="h-4 w-4" /> Delete customer
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
