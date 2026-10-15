import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Toolbar, TableWrap, Empty, IconButton, naira, StatusPill } from "./ui";
import {
  Search, Filter, Download, Plus, Truck, Star, Crown, Pause, Play, Ban,
  Mail, Phone, MapPin, Package, Clock, TrendingUp, X, Building2, Globe,
  MoreHorizontal, Trash2, Edit3, Save,
} from "lucide-react";
import { useSuppliers, type Supplier, type SupplierStatus, type SupplierTier } from "@/lib/suppliers-store";
import { downloadCSV } from "@/lib/admin-export";

const TIER_META: Record<SupplierTier, { label: string; tone: Parameters<typeof Chip>[0]["tone"] }> = {
  diamond: { label: "Diamond", tone: "purple" },
  platinum: { label: "Platinum", tone: "blue" },
  gold: { label: "Gold", tone: "gold" },
  silver: { label: "Silver", tone: "slate" },
};

const STATUS_TABS: { id: SupplierStatus | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "paused", label: "Paused" },
  { id: "blocked", label: "Blocked" },
];

function money(n: number) { return naira(n); }

function Metric({ label, value, sub, tone = "ink" }: { label: string; value: string; sub?: string; tone?: "ink" | "gold" | "green" | "red" }) {
  const toneCls = tone === "gold" ? "text-gold-deep" : tone === "green" ? "text-ink" : tone === "red" ? "text-rose-700" : "text-ink";
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-2xl mt-1 ${toneCls}`}>{value}</div>
      {sub && <div className="text-[12px] text-muted-foreground mt-1">{sub}</div>}
    </Card>
  );
}

export function Suppliers() {
  const suppliers = useSuppliers((s) => s.suppliers);
  const setStatus = useSuppliers((s) => s.setStatus);
  const toggleVip = useSuppliers((s) => s.toggleVip);
  const updateNotes = useSuppliers((s) => s.updateNotes);
  const remove = useSuppliers((s) => s.remove);
  const hydrate = useSuppliers((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SupplierStatus | "all">("all");
  const [tier, setTier] = useState<SupplierTier | "all">("all");
  const [country, setCountry] = useState<string>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");

  const countries = useMemo(
    () => Array.from(new Set(suppliers.map((s) => s.country))).sort(),
    [suppliers]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (tab !== "all" && s.status !== tab) return false;
      if (tier !== "all" && s.tier !== tier) return false;
      if (country !== "all" && s.country !== country) return false;
      if (!q) return true;
      const hay = [s.name, s.contact, s.email, s.country, s.city, ...s.brands, ...s.categories, s.id]
        .join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [suppliers, query, tab, tier, country]);

  const kpis = useMemo(() => {
    const active = suppliers.filter((s) => s.status === "active");
    const spend = suppliers.reduce((a, b) => a + b.totalSpend, 0);
    const orders = suppliers.reduce((a, b) => a + b.totalOrders, 0);
    const avgOnTime = active.length
      ? Math.round(active.reduce((a, b) => a + b.onTimeRate, 0) / active.length)
      : 0;
    return {
      total: suppliers.length,
      active: active.length,
      vip: suppliers.filter((s) => s.vip).length,
      spend, orders, avgOnTime,
    };
  }, [suppliers]);

  const selected = selectedId ? suppliers.find((s) => s.id === selectedId) ?? null : null;

  function exportCsv() {
    const rows = filtered.map((s) => ({
      id: s.id, name: s.name, tier: s.tier, status: s.status,
      country: s.country, city: s.city, contact: s.contact, email: s.email, phone: s.phone,
      categories: s.categories.join("; "), brands: s.brands.join("; "),
      leadTimeDays: s.leadTimeDays, onTimeRate: s.onTimeRate, fulfillmentRate: s.fulfillmentRate,
      totalOrders: s.totalOrders, totalSpend: s.totalSpend, rating: s.rating,
      paymentTerms: s.paymentTerms, currency: s.currency, vip: s.vip ? "yes" : "no",
    }));
    downloadCSV(`asl-suppliers-${Date.now()}.csv`, rows);
  }

  function openSupplier(s: Supplier) {
    setSelectedId(s.id);
    setEditingNotes(false);
    setNotesDraft(s.notes);
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Suppliers"
        subtitle="Boutique partners, wholesalers and sourcing agents fulfilling concierge requests."
        actions={
          <>
            <button
              onClick={exportCsv}
              className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black/[0.04]"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => alert("New supplier form - coming next phase.")}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-medium inline-flex items-center gap-2 hover:bg-black"
            >
              <Plus className="w-4 h-4" /> New supplier
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <Metric label="Total suppliers" value={String(kpis.total)} sub={`${kpis.active} active`} />
        <Metric label="VIP partners" value={String(kpis.vip)} sub="Priority allocation" tone="gold" />
        <Metric label="Avg on-time" value={`${kpis.avgOnTime}%`} sub="Active suppliers" tone={kpis.avgOnTime >= 90 ? "green" : "ink"} />
        <Metric label="Orders placed" value={kpis.orders.toLocaleString()} sub="All time" />
        <Metric label="Total spend" value={money(kpis.spend)} sub="All time · NGN eq." />
      </div>

      {/* Toolbar */}
      <Toolbar>
        <div className="flex items-center gap-2 bg-white border border-black/10 rounded-md h-9 px-3 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search suppliers, brands, contact…"
            className="bg-transparent outline-none text-[13px] flex-1"
          />
        </div>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as SupplierTier | "all")}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All tiers</option>
          <option value="diamond">Diamond</option>
          <option value="platinum">Platinum</option>
          <option value="gold">Gold</option>
          <option value="silver">Silver</option>
        </select>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="h-9 px-3 rounded-md border border-black/10 bg-white text-[13px]"
        >
          <option value="all">All countries</option>
          {countries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Toolbar>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-black/[0.06]">
        {STATUS_TABS.map((t) => {
          const count = t.id === "all" ? suppliers.length : suppliers.filter((s) => s.status === t.id).length;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 h-9 text-[13px] font-medium border-b-2 -mb-px transition-colors ${
                active ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {t.label}
              <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded-full bg-black/[0.05] text-ink/70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <TableWrap>
        <table className="w-full text-[13px]">
          <thead className="bg-black/[0.02] text-muted-foreground text-left text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Categories</th>
              <th className="px-4 py-3 text-right">Lead</th>
              <th className="px-4 py-3 text-right">On-time</th>
              <th className="px-4 py-3 text-right">Orders</th>
              <th className="px-4 py-3 text-right">Spend</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                onClick={() => openSupplier(s)}
                className="border-t border-black/[0.05] cursor-pointer hover:bg-black/[0.02]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-ink text-white grid place-items-center font-display text-[13px]">
                      {s.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-ink flex items-center gap-1.5">
                        <span className="truncate">{s.name}</span>
                        {s.vip && <Crown className="w-3.5 h-3.5 text-gold-deep" />}
                      </div>
                      <div className="text-[12px] text-muted-foreground truncate">
                        {s.contact} · {s.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-ink/80">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    {s.city}, {s.country}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {s.categories.slice(0, 2).map((c) => <Chip key={c}>{c}</Chip>)}
                    {s.categories.length > 2 && <Chip>+{s.categories.length - 2}</Chip>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.leadTimeDays}d</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {s.onTimeRate > 0 ? (
                    <span className={s.onTimeRate >= 90 ? "text-ink" : s.onTimeRate >= 80 ? "text-amber-700" : "text-rose-700"}>
                      {s.onTimeRate}%
                    </span>
                  ) : <span className="text-muted-foreground"> - </span>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{s.totalOrders}</td>
                <td className="px-4 py-3 text-right tabular-nums">{money(s.totalSpend)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <Chip tone={TIER_META[s.tier].tone}>{TIER_META[s.tier].label}</Chip>
                    <StatusPill status={s.status} />
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground inline" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <Empty title="No suppliers match" sub="Try clearing filters or adjusting your search." />
        )}
      </TableWrap>

      {/* Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex" onClick={() => setSelectedId(null)}>
          <div className="flex-1 bg-black/40" />
          <div
            className="w-full max-w-[520px] bg-white h-full overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-black/[0.06] sticky top-0 bg-white z-10">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <Building2 className="w-3.5 h-3.5" /> {selected.id}
                  </div>
                  <h2 className="font-display text-2xl mt-1 flex items-center gap-2">
                    {selected.name}
                    {selected.vip && <Crown className="w-5 h-5 text-gold-deep" />}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Chip tone={TIER_META[selected.tier].tone}>{TIER_META[selected.tier].label} tier</Chip>
                    <StatusPill status={selected.status} />
                    {selected.rating > 0 && (
                      <span className="inline-flex items-center gap-1 text-[12px] text-ink/80">
                        <Star className="w-3.5 h-3.5 fill-[#c9a54a] text-[#c9a54a]" />
                        {selected.rating.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <IconButton onClick={() => setSelectedId(null)} title="Close">
                  <X className="w-4 h-4" />
                </IconButton>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact */}
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Contact</div>
                <div className="space-y-2 text-[13px]">
                  <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /> {selected.contact}</div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /> <a href={`mailto:${selected.email}`} className="text-ink hover:underline">{selected.email}</a></div>
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /> <a href={`tel:${selected.phone}`} className="text-ink hover:underline">{selected.phone}</a></div>
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-muted-foreground" /> {selected.city}, {selected.country}</div>
                  <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> Payments in {selected.currency} · {selected.paymentTerms}</div>
                </div>
              </section>

              {/* Metrics */}
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Performance</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-black/[0.06] p-3">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Avg lead time</div>
                    <div className="font-display text-xl mt-1">{selected.leadTimeDays} days</div>
                  </div>
                  <div className="rounded-lg border border-black/[0.06] p-3">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3" /> On-time rate</div>
                    <div className="font-display text-xl mt-1">{selected.onTimeRate}%</div>
                  </div>
                  <div className="rounded-lg border border-black/[0.06] p-3">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Fulfillment</div>
                    <div className="font-display text-xl mt-1">{selected.fulfillmentRate}%</div>
                  </div>
                  <div className="rounded-lg border border-black/[0.06] p-3">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Orders / spend</div>
                    <div className="font-display text-xl mt-1">{selected.totalOrders}</div>
                    <div className="text-[12px] text-muted-foreground">{money(selected.totalSpend)}</div>
                  </div>
                </div>
              </section>

              {/* Categories + Brands */}
              <section>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Categories</div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.categories.map((c) => <Chip key={c}>{c}</Chip>)}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Brands sourced</div>
                <div className="flex flex-wrap gap-1.5">
                  {selected.brands.map((b) => <Chip key={b} tone="gold">{b}</Chip>)}
                </div>
              </section>

              {/* Notes */}
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Internal notes</div>
                  {editingNotes ? (
                    <button
                      onClick={() => { updateNotes(selected.id, notesDraft); setEditingNotes(false); }}
                      className="text-[12px] font-medium text-ink inline-flex items-center gap-1 hover:underline"
                    >
                      <Save className="w-3.5 h-3.5" /> Save
                    </button>
                  ) : (
                    <button
                      onClick={() => { setNotesDraft(selected.notes); setEditingNotes(true); }}
                      className="text-[12px] font-medium text-ink inline-flex items-center gap-1 hover:underline"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    rows={4}
                    className="w-full text-[13px] border border-black/10 rounded-md p-3 outline-none focus:border-ink"
                  />
                ) : (
                  <p className="text-[13px] text-ink/80 leading-relaxed">
                    {selected.notes || <span className="text-muted-foreground">No notes yet.</span>}
                  </p>
                )}
              </section>

              {/* Actions */}
              <section className="pt-2 border-t border-black/[0.06]">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Actions</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleVip(selected.id)}
                    className="h-9 rounded-md border border-black/10 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black/[0.04]"
                  >
                    <Crown className="w-4 h-4 text-gold-deep" />
                    {selected.vip ? "Remove VIP" : "Mark VIP"}
                  </button>
                  {selected.status === "active" ? (
                    <button
                      onClick={() => setStatus(selected.id, "paused")}
                      className="h-9 rounded-md border border-black/10 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black/[0.04]"
                    >
                      <Pause className="w-4 h-4" /> Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(selected.id, "active")}
                      className="h-9 rounded-md border border-black/10 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black/[0.04]"
                    >
                      <Play className="w-4 h-4" /> Activate
                    </button>
                  )}
                  <button
                    onClick={() => setStatus(selected.id, "blocked")}
                    className="h-9 rounded-md border border-rose-200 text-rose-700 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-rose-50"
                  >
                    <Ban className="w-4 h-4" /> Block
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete ${selected.name}? This cannot be undone.`)) {
                        remove(selected.id);
                        setSelectedId(null);
                      }
                    }}
                    className="h-9 rounded-md border border-black/10 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 hover:bg-black/[0.04]"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
