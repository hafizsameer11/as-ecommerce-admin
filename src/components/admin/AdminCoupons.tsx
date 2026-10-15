import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, StatusPill, TableWrap, Toolbar, naira } from "./ui";
import {
  useCoupons, type Coupon, type CouponStatus, type CouponType, type CouponAppliesTo, type CouponEligibility,
} from "@/lib/coupons-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Ticket, Search, Download, Plus, Copy, Trash2, Pin, PinOff, Play, Pause, Archive,
  X, Check, Percent, Banknote, Truck, Gift, Sparkles, Calendar, Users, TrendingUp,
  Filter as FilterIcon, MoreHorizontal, Zap, ClipboardCheck,
} from "lucide-react";

type Tab = "all" | CouponStatus;

const STATUS_LABEL: Record<CouponStatus, string> = {
  active: "Active", scheduled: "Scheduled", expired: "Expired", paused: "Paused", draft: "Draft",
};

const TYPE_META: Record<CouponType, { label: string; Icon: typeof Percent; tone: Parameters<typeof Chip>[0]["tone"] }> = {
  percent: { label: "% off", Icon: Percent, tone: "gold" },
  fixed: { label: "₦ off", Icon: Banknote, tone: "green" },
  free_shipping: { label: "Free shipping", Icon: Truck, tone: "blue" },
  bogo: { label: "BOGO", Icon: Gift, tone: "purple" },
};

export function AdminCoupons() {
  const { coupons, update, remove, duplicate, setStatus, togglePin, create, hydrate } = useCoupons();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | CouponType>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return coupons
      .filter((c) => tab === "all" ? true : c.status === tab)
      .filter((c) => typeFilter === "all" ? true : c.type === typeFilter)
      .filter((c) => !query || [c.code, c.title, c.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(query)))
      .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt.localeCompare(a.updatedAt));
  }, [coupons, tab, typeFilter, q]);

  const kpis = useMemo(() => {
    const active = coupons.filter((c) => c.status === "active");
    return {
      active: active.length,
      redemptions: coupons.reduce((s, c) => s + c.redemptions, 0),
      revenue: coupons.reduce((s, c) => s + c.revenue, 0),
      scheduled: coupons.filter((c) => c.status === "scheduled").length,
      avgOrder: (() => {
        const totalRed = coupons.reduce((s, c) => s + c.redemptions, 0);
        const totalRev = coupons.reduce((s, c) => s + c.revenue, 0);
        return totalRed ? Math.round(totalRev / totalRed) : 0;
      })(),
    };
  }, [coupons]);

  const openCoupon = coupons.find((c) => c.id === openId) || null;

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(filtered.map((c) => c.id)));
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkPause = () => {
    void Promise.all([...selected].map((id) => setStatus(id, "paused")));
    setSelected(new Set());
  };
  const bulkActivate = () => {
    void Promise.all([...selected].map((id) => setStatus(id, "active")));
    setSelected(new Set());
  };
  const bulkDelete = () => {
    if (!confirm(`Delete ${selected.size} coupons?`)) return;
    void Promise.all([...selected].map((id) => remove(id)));
    setSelected(new Set());
  };

  const exportCSV = () => downloadCSV("coupons.csv", filtered.map((c) => ({
    Code: c.code, Title: c.title, Type: c.type, Value: c.value, Status: c.status,
    Starts: c.startsAt.slice(0, 10), Ends: c.endsAt?.slice(0, 10) ?? "",
    MinSubtotal: c.minSubtotal ?? "", MaxDiscount: c.maxDiscount ?? "",
    UsageLimit: c.usageLimit ?? "", Used: c.used, Redemptions: c.redemptions,
    Revenue: c.revenue, AppliesTo: c.appliesTo, Eligibility: c.eligibility,
    Channels: c.channels.join("|"), AutoApply: c.autoApply ? "Yes" : "No",
    Stackable: c.stackable ? "Yes" : "No",
  })));

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "all", label: "All", count: coupons.length },
    { id: "active", label: "Active", count: coupons.filter((c) => c.status === "active").length },
    { id: "scheduled", label: "Scheduled", count: coupons.filter((c) => c.status === "scheduled").length },
    { id: "paused", label: "Paused", count: coupons.filter((c) => c.status === "paused").length },
    { id: "draft", label: "Draft", count: coupons.filter((c) => c.status === "draft").length },
    { id: "expired", label: "Expired", count: coupons.filter((c) => c.status === "expired").length },
  ];

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Coupons"
        subtitle="Discount codes, automatic promos and stackable rules across web, mobile and concierge."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New coupon
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KPI label="Active codes" value={kpis.active.toLocaleString()} Icon={Sparkles} />
        <KPI label="Scheduled" value={kpis.scheduled.toLocaleString()} Icon={Calendar} />
        <KPI label="Redemptions" value={kpis.redemptions.toLocaleString()} Icon={Users} />
        <KPI label="Revenue attributed" value={naira(kpis.revenue)} Icon={TrendingUp} tone="text-ink" />
        <KPI label="Avg order" value={naira(kpis.avgOrder)} Icon={Banknote} />
      </div>

      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
            }`}
          >
            {t.label} <span className="ml-1 text-[11px] text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search code, title, description…"
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <FilterIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "all" | CouponType)} className="bg-transparent outline-none pr-1">
            <option value="all">All types</option>
            <option value="percent">Percent off</option>
            <option value="fixed">Amount off</option>
            <option value="free_shipping">Free shipping</option>
            <option value="bogo">BOGO</option>
          </select>
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">{filtered.length} of {coupons.length}</div>
      </Toolbar>

      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex items-center gap-2 bg-ink text-white rounded-md px-3 h-11 text-[12.5px]">
          <span className="font-semibold">{selected.size} selected</span>
          <button onClick={bulkActivate} className="ml-auto h-8 px-3 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" /> Activate
          </button>
          <button onClick={bulkPause} className="h-8 px-3 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1.5">
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
          <button onClick={bulkDelete} className="h-8 px-3 rounded bg-rose-500 hover:bg-rose-600 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={() => setSelected(new Set())} className="h-8 w-8 grid place-items-center rounded hover:bg-white/10">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card><Empty title="No coupons match" sub="Try clearing filters or create a new coupon." /></Card>
      ) : (
        <TableWrap>
          <table className="w-full text-[13px]">
            <thead className="bg-[#faf8f3] text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2.5 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                </th>
                <th className="text-left px-3 py-2.5">Coupon</th>
                <th className="text-left px-3 py-2.5">Type</th>
                <th className="text-left px-3 py-2.5">Discount</th>
                <th className="text-left px-3 py-2.5">Window</th>
                <th className="text-left px-3 py-2.5">Status</th>
                <th className="text-right px-3 py-2.5">Redeemed</th>
                <th className="text-right px-3 py-2.5">Revenue</th>
                <th className="text-right px-3 py-2.5 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const meta = TYPE_META[c.type];
                const usePct = c.usageLimit ? Math.min(100, Math.round((c.used / c.usageLimit) * 100)) : null;
                return (
                  <tr key={c.id} className="border-t border-black/[0.06] hover:bg-black/[0.02]">
                    <td className="px-3 py-3">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setOpenId(c.id)} className="font-sans text-[12.5px] font-semibold bg-black/[0.04] border border-black/10 rounded px-1.5 py-0.5 hover:bg-black/[0.08]">
                          {c.code}
                        </button>
                        {c.pinned && <Pin className="h-3 w-3 text-gold fill-gold" />}
                        {c.autoApply && <Chip tone="blue"><Zap className="h-3 w-3" /> Auto</Chip>}
                      </div>
                      <div className="text-[12px] text-ink mt-0.5">{c.title}</div>
                    </td>
                    <td className="px-3 py-3">
                      <Chip tone={meta.tone}><meta.Icon className="h-3 w-3" /> {meta.label}</Chip>
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {c.type === "percent" && <span className="font-semibold">{c.value}%</span>}
                      {c.type === "fixed" && <span className="font-semibold">{naira(c.value)}</span>}
                      {c.type === "free_shipping" && <span className="text-muted-foreground">Ship: ₦0</span>}
                      {c.type === "bogo" && <span className="font-semibold">Buy 1 get 1</span>}
                      {c.minSubtotal ? <div className="text-[11px] text-muted-foreground">min {naira(c.minSubtotal)}</div> : null}
                    </td>
                    <td className="px-3 py-3 text-[12px]">
                      <div>{new Date(c.startsAt).toLocaleDateString()}</div>
                      <div className="text-muted-foreground">{c.endsAt ? `→ ${new Date(c.endsAt).toLocaleDateString()}` : "No end"}</div>
                    </td>
                    <td className="px-3 py-3"><StatusPill status={STATUS_LABEL[c.status]} /></td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="font-semibold">{c.used.toLocaleString()}{c.usageLimit ? <span className="text-muted-foreground font-normal"> / {c.usageLimit.toLocaleString()}</span> : ""}</div>
                      {usePct !== null && (
                        <div className="mt-1 h-1 w-16 ml-auto rounded-full bg-black/[0.06] overflow-hidden">
                          <div className="h-full bg-ink" style={{ width: `${usePct}%` }} />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold">{c.revenue ? naira(c.revenue) : " - "}</td>
                    <td className="px-3 py-3 text-right">
                      <button onClick={() => setOpenId(c.id)} className="text-[12px] font-semibold text-ink hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {openCoupon && (
        <CouponDrawer
          key={openCoupon.id}
          coupon={openCoupon}
          onClose={() => setOpenId(null)}
          onSave={(patch) => void update(openCoupon.id, patch)}
          onSetStatus={(s) => void setStatus(openCoupon.id, s)}
          onDuplicate={() => {
            void duplicate(openCoupon.id).then((c) => {
              if (c) setOpenId(c.id);
            });
          }}
          onTogglePin={() => void togglePin(openCoupon.id)}
          onDelete={() => {
            if (confirm("Delete this coupon?")) {
              void remove(openCoupon.id).then(() => setOpenId(null));
            }
          }}
        />
      )}

      {showNew && (
        <NewCouponModal
          onClose={() => setShowNew(false)}
          onCreate={(payload) => {
            void create(payload).then((c) => {
              setShowNew(false);
              setOpenId(c.id);
            });
          }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof Ticket; tone?: string }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
          <div className={`font-display text-[22px] leading-tight mt-1 ${tone}`}>{value}</div>
        </div>
        <div className="h-8 w-8 rounded-md bg-black/[0.04] grid place-items-center"><Icon className="h-4 w-4 text-muted-foreground" /></div>
      </div>
    </Card>
  );
}

function CouponDrawer({
  coupon, onClose, onSave, onSetStatus, onDuplicate, onTogglePin, onDelete,
}: {
  coupon: Coupon;
  onClose: () => void;
  onSave: (patch: Partial<Coupon>) => void;
  onSetStatus: (s: CouponStatus) => void;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({ ...coupon });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const patch = <K extends keyof Coupon>(k: K, v: Coupon[K]) => setForm({ ...form, [k]: v });

  const save = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const copyCode = () => {
    navigator.clipboard.writeText(form.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const toggleChannel = (ch: "web" | "mobile" | "concierge") => {
    const set = new Set(form.channels);
    set.has(ch) ? set.delete(ch) : set.add(ch);
    patch("channels", Array.from(set) as Coupon["channels"]);
  };

  const meta = TYPE_META[coupon.type];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Coupon</div>
            <div className="font-display font-bold text-[15px] leading-tight flex items-center gap-2">
              <span className="font-sans">{coupon.code}</span>
              <StatusPill status={STATUS_LABEL[coupon.status]} />
            </div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {coupon.status !== "active" && (
              <button onClick={() => onSetStatus("active")} className="h-8 px-3 rounded-md border border-border bg-muted text-ink text-[12px] font-semibold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Activate
              </button>
            )}
            {coupon.status === "active" && (
              <button onClick={() => onSetStatus("paused")} className="h-8 px-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-semibold flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            <button onClick={() => onSetStatus("expired")} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Archive className="h-3.5 w-3.5" /> Expire
            </button>
            <button onClick={onTogglePin} className={`h-8 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 ${coupon.pinned ? "bg-gold/15 border-gold/30 text-gold-deep" : "bg-white border-black/10 hover:bg-black/[0.04]"}`}>
              {coupon.pinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Pin</>}
            </button>
            <button onClick={onDuplicate} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          </div>

          <Section title="Preview">
            <div className="relative rounded-xl border border-dashed border-gold/40 bg-gradient-to-br from-[#faf6ea] to-white p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-gold/15 grid place-items-center">
                <meta.Icon className="h-5 w-5 text-gold-deep" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-display text-[15px] leading-tight">{form.title}</div>
                <div className="text-[11.5px] text-muted-foreground truncate">{form.description || "Apply at checkout"}</div>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  <span className="font-sans text-[12px] font-semibold bg-white border border-black/10 rounded px-1.5 py-0.5">{form.code}</span>
                  <button onClick={copyCode} className="text-[11px] text-muted-foreground hover:text-ink flex items-center gap-1">
                    {copied ? <><ClipboardCheck className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-[20px] leading-tight text-gold-deep">
                  {form.type === "percent" ? `${form.value}%` : form.type === "fixed" ? naira(form.value) : form.type === "free_shipping" ? "FREE" : "BOGO"}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Off</div>
              </div>
            </div>
          </Section>

          <Section title="Basics">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Code" value={form.code} onChange={(v) => patch("code", v.toUpperCase())} mono />
              <Field label="Title" value={form.title} onChange={(v) => patch("title", v)} />
              <label className="col-span-2 block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Description</div>
                <textarea
                  value={form.description ?? ""}
                  onChange={(e) => patch("description", e.target.value)}
                  rows={2}
                  className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none"
                />
              </label>
            </div>
          </Section>

          <Section title="Discount">
            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Type" value={form.type} onChange={(v) => patch("type", v as CouponType)} options={[
                { value: "percent", label: "Percent off" },
                { value: "fixed", label: "Amount off" },
                { value: "free_shipping", label: "Free shipping" },
                { value: "bogo", label: "Buy one get one" },
              ]} />
              <NumberField label={form.type === "percent" ? "Value (%)" : "Value (₦)"} value={form.value} onChange={(v) => patch("value", v)} disabled={form.type === "free_shipping"} />
              <NumberField label="Min subtotal (₦)" value={form.minSubtotal ?? 0} onChange={(v) => patch("minSubtotal", v || undefined)} />
              <NumberField label="Max discount (₦)" value={form.maxDiscount ?? 0} onChange={(v) => patch("maxDiscount", v || undefined)} />
            </div>
          </Section>

          <Section title="Schedule">
            <div className="grid grid-cols-2 gap-2.5">
              <DateField label="Starts" value={form.startsAt} onChange={(v) => patch("startsAt", v)} />
              <DateField label="Ends" value={form.endsAt ?? ""} onChange={(v) => patch("endsAt", v || undefined)} />
            </div>
          </Section>

          <Section title="Eligibility & applies to">
            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Eligibility" value={form.eligibility} onChange={(v) => patch("eligibility", v as CouponEligibility)} options={[
                { value: "all", label: "All customers" },
                { value: "new", label: "New customers" },
                { value: "vip", label: "VIP / Signature" },
                { value: "segment", label: "Specific segment" },
              ]} />
              <Select label="Applies to" value={form.appliesTo} onChange={(v) => patch("appliesTo", v as CouponAppliesTo)} options={[
                { value: "all", label: "Entire catalog" },
                { value: "categories", label: "Categories" },
                { value: "brands", label: "Brands" },
                { value: "products", label: "Products" },
                { value: "collections", label: "Collections" },
              ]} />
              <NumberField label="Usage limit" value={form.usageLimit ?? 0} onChange={(v) => patch("usageLimit", v || undefined)} />
              <NumberField label="Per customer" value={form.perCustomerLimit ?? 0} onChange={(v) => patch("perCustomerLimit", v || undefined)} />
            </div>
          </Section>

          <Section title="Channels & rules">
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(["web", "mobile", "concierge"] as const).map((ch) => (
                <button
                  key={ch}
                  onClick={() => toggleChannel(ch)}
                  className={`h-7 px-2.5 rounded-full border text-[11.5px] font-semibold capitalize ${
                    form.channels.includes(ch) ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Toggle label="Auto-apply at checkout" value={form.autoApply} onChange={(v) => patch("autoApply", v)} hint="No code entry required." />
              <Toggle label="Stackable with other codes" value={form.stackable} onChange={(v) => patch("stackable", v)} />
              <Toggle label="One redemption per customer" value={form.oncePerCustomer} onChange={(v) => patch("oncePerCustomer", v)} />
            </div>
          </Section>

          <Section title="Performance">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Redeemed" value={coupon.redemptions.toLocaleString()} />
              <Stat label="Revenue" value={naira(coupon.revenue)} />
              <Stat label="Avg order" value={coupon.redemptions ? naira(Math.round(coupon.revenue / coupon.redemptions)) : " - "} />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value)}
              placeholder="Campaign context, approval, negotiation notes…"
              rows={3}
              className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none"
            />
          </Section>
        </div>

        <div className="border-t border-black/[0.08] p-4 flex items-center gap-2 shrink-0">
          <button onClick={onDelete} className="h-9 px-3 rounded-md border border-rose-200 bg-white text-rose-600 text-[12.5px] font-semibold hover:bg-rose-50 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
          <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
            {saved ? <><Check className="h-3.5 w-3.5" /> Saved</> : "Save changes"}
          </button>
        </div>
      </aside>
    </>
  );
}

function NewCouponModal({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (payload: Omit<Coupon, "id" | "used" | "redemptions" | "revenue" | "createdAt" | "updatedAt" | "pinned">) => void;
}) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CouponType>("percent");
  const [value, setValue] = useState(10);

  const random = () => setCode(Math.random().toString(36).slice(2, 8).toUpperCase());

  const submit = () => {
    if (!code.trim() || !title.trim()) return;
    onCreate({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      type,
      value,
      status: "draft",
      startsAt: new Date().toISOString(),
      appliesTo: "all",
      eligibility: "all",
      stackable: false,
      autoApply: false,
      oncePerCustomer: false,
      channels: ["web", "mobile"],
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="h-12 px-4 border-b border-black/[0.08] flex items-center justify-between">
            <div className="font-display font-bold text-[15px]">New coupon</div>
            <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
          </div>
          <div className="p-4 space-y-3">
            <label className="block">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Code</div>
              <div className="flex gap-2">
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="SUMMER25" className="flex-1 font-sans h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink" />
                <button onClick={random} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold hover:bg-black/[0.04]">Generate</button>
              </div>
            </label>
            <Field label="Title" value={title} onChange={setTitle} />
            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Type" value={type} onChange={(v) => setType(v as CouponType)} options={[
                { value: "percent", label: "Percent off" },
                { value: "fixed", label: "Amount off" },
                { value: "free_shipping", label: "Free shipping" },
                { value: "bogo", label: "Buy one get one" },
              ]} />
              <NumberField label={type === "percent" ? "Value (%)" : "Value (₦)"} value={value} onChange={setValue} disabled={type === "free_shipping"} />
            </div>
            <div className="text-[11.5px] text-muted-foreground">Created as draft. Configure schedule, eligibility and channels in the next step.</div>
          </div>
          <div className="border-t border-black/[0.08] p-3 flex items-center gap-2">
            <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
            <button onClick={submit} disabled={!code.trim() || !title.trim()} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-40 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Create draft
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-2">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, mono = false }: { label: string; value: string; onChange: (v: string) => void; mono?: boolean }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink ${mono ? "font-sans" : ""}`}
      />
    </label>
  );
}

function NumberField({ label, value, onChange, disabled }: { label: string; value: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input
        type="number"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] tabular-nums outline-none focus:border-ink disabled:bg-black/[0.03] disabled:text-muted-foreground"
      />
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const dt = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input
        type="date"
        value={dt}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full h-9 rounded-md border border-black/10 bg-white px-2 text-[13px] outline-none focus:border-ink">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button onClick={() => onChange(!value)} className="w-full flex items-center gap-3 rounded-md border border-black/[0.06] bg-[#faf8f3] px-3 py-2 text-left hover:bg-black/[0.04]">
      <div className={`h-5 w-9 rounded-full transition-colors relative ${value ? "bg-ink" : "bg-black/15"}`}>
        <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${value ? "left-4" : "left-0.5"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-semibold">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-2.5">
      <div className="font-display text-[15px] leading-tight">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  );
}
