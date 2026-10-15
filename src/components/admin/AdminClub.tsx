import { useEffect, useMemo, useState } from "react";
import {
  Crown, Sparkles, Users, Gift, Coins, TrendingUp, Plus, Edit3, Copy, Trash2, X,
  Download, Search, Truck, Wallet, Star, Package, Headphones, Save, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Toolbar, Empty, naira } from "./ui";
import { useClub, type ClubReward, type ClubTier, type ClubRule } from "@/lib/club-store";
import { useCustomers, type CustomerTier } from "@/lib/customers-store";
import { downloadCSV } from "@/lib/admin-export";

const fmtShort = (n: number) => n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `₦${(n / 1000).toFixed(0)}k` : `₦${n}`;
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

const CAT_META: Record<ClubReward["category"], { label: string; icon: any; tone: any }> = {
  shipping: { label: "Shipping", icon: Truck, tone: "blue" },
  credit: { label: "Store Credit", icon: Wallet, tone: "green" },
  experience: { label: "Experience", icon: Star, tone: "gold" },
  product: { label: "Product", icon: Package, tone: "purple" },
  concierge: { label: "Concierge", icon: Headphones, tone: "amber" },
};

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

// ============ Tier card ============
function TierCard({ tier, memberCount, spendTotal, onEdit }: {
  tier: ClubTier; memberCount: number; spendTotal: number; onEdit: () => void;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: tier.color }} />
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg grid place-items-center" style={{ background: tier.color + "22", color: tier.color }}>
            <Crown className="h-4 w-4" />
          </div>
          <div>
            <div className="font-display text-[16px]">{tier.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {tier.minSpend > 0 ? `From ${fmtShort(tier.minSpend)} lifetime spend` : "Entry tier"}
            </div>
          </div>
        </div>
        <button onClick={onEdit} className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/5 text-muted-foreground">
          <Edit3 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-black/[0.03] p-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Members</div>
          <div className="font-display text-[18px] mt-0.5">{memberCount}</div>
        </div>
        <div className="rounded-lg bg-black/[0.03] p-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Multiplier</div>
          <div className="font-display text-[18px] mt-0.5">{tier.pointsMultiplier}×</div>
        </div>
        <div className="rounded-lg bg-black/[0.03] p-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Spend</div>
          <div className="font-display text-[15px] mt-0.5">{fmtShort(spendTotal)}</div>
        </div>
      </div>
      <ul className="space-y-1 text-[12px] text-ink/80">
        {tier.perks.map((p, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 shrink-0 mt-1" style={{ color: tier.color }} />
            <span>{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between text-[11px]">
        <Chip tone={tier.active ? "green" : "slate"}>{tier.active ? "Active" : "Inactive"}</Chip>
        <span className="text-muted-foreground">{tier.id}</span>
      </div>
    </Card>
  );
}

// ============ Reward card ============
function RewardCard({ reward, onEdit, onDuplicate, onRemove, onToggle }: {
  reward: ClubReward; onEdit: () => void; onDuplicate: () => void; onRemove: () => void; onToggle: () => void;
}) {
  const meta = CAT_META[reward.category];
  const Icon = meta.icon;
  const stockPct = reward.stock == null ? null : Math.min(100, Math.round((reward.redeemed / (reward.stock + reward.redeemed || 1)) * 100));
  return (
    <Card>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg grid place-items-center bg-black/[0.04]"><Icon className="h-4 w-4 text-ink" /></div>
          <div>
            <div className="font-display text-[15px] leading-tight">{reward.title}</div>
            <Chip tone={meta.tone} className="mt-1">{meta.label}</Chip>
          </div>
        </div>
        <button onClick={onToggle} className={`text-[10px] px-2 h-6 rounded-full border ${reward.active ? "bg-ink text-white border-ink" : "bg-black/5 text-muted-foreground border-black/10"}`}>
          {reward.active ? "Live" : "Off"}
        </button>
      </div>
      <p className="text-[12px] text-muted-foreground line-clamp-2 min-h-[32px]">{reward.description}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-gold/10 border border-gold/20 p-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-gold-deep">Cost</div>
          <div className="font-display text-[17px] text-gold-deep mt-0.5">{reward.cost.toLocaleString()} pts</div>
        </div>
        <div className="rounded-lg bg-black/[0.03] p-2">
          <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Redeemed</div>
          <div className="font-display text-[17px] mt-0.5">{reward.redeemed}</div>
        </div>
      </div>

      {reward.stock != null && (
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
            <span>Stock</span><span>{reward.stock} left</span>
          </div>
          <div className="h-1.5 rounded-full bg-black/5 overflow-hidden">
            <div className="h-full bg-ink" style={{ width: `${stockPct}%` }} />
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {reward.eligibleTiers.map((t) => (
          <span key={t} className="text-[10px] px-1.5 h-5 grid place-items-center rounded-full border border-black/10 bg-white">{t}</span>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-end gap-1">
        <button onClick={onDuplicate} title="Duplicate" className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/5"><Copy className="h-3.5 w-3.5" /></button>
        <button onClick={onEdit} title="Edit" className="h-7 w-7 grid place-items-center rounded-md hover:bg-black/5"><Edit3 className="h-3.5 w-3.5" /></button>
        <button onClick={onRemove} title="Delete" className="h-7 w-7 grid place-items-center rounded-md hover:bg-rose-50 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
    </Card>
  );
}

// ============ Tier editor drawer ============
type Drawer =
  | { kind: "closed" }
  | { kind: "tier"; id: CustomerTier }
  | { kind: "reward"; id: string | null }
  | { kind: "rules" };

function DrawerShell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-[520px] bg-white h-full flex flex-col animate-in slide-in-from-right">
        <div className="h-14 px-5 flex items-center justify-between border-b border-black/10">
          <div className="font-display text-[16px]">{title}</div>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/5"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-black/10 p-4 flex items-center justify-end gap-2 bg-white">{footer}</div>}
      </div>
    </div>
  );
}

const inputCls = "w-full h-9 px-3 rounded-lg border border-black/10 bg-white text-sm";
const labelCls = "text-[11px] uppercase tracking-[0.15em] text-muted-foreground mb-1 block";

function TierEditor({ tierId, onClose }: { tierId: CustomerTier; onClose: () => void }) {
  const src = useClub((s) => s.tiers.find((t) => t.id === tierId)!);
  const updateTier = useClub((s) => s.updateTier);
  const [name, setName] = useState(src.name);
  const [minSpend, setMinSpend] = useState(src.minSpend);
  const [mult, setMult] = useState(src.pointsMultiplier);
  const [color, setColor] = useState(src.color);
  const [active, setActive] = useState(src.active);
  const [perks, setPerks] = useState(src.perks.join("\n"));

  function save() {
    updateTier(tierId, {
      name, minSpend: Number(minSpend) || 0, pointsMultiplier: Number(mult) || 1,
      color, active, perks: perks.split("\n").map((p) => p.trim()).filter(Boolean),
    });
    onClose();
  }

  return (
    <DrawerShell
      title={`Edit tier · ${src.name}`}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-black/10 text-sm">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-lg bg-ink text-white text-sm inline-flex items-center gap-1.5"><Save className="h-4 w-4" /> Save tier</button>
        </>
      }
    >
      <div className="space-y-4">
        <div><label className={labelCls}>Name</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Min lifetime spend (₦)</label>
            <input className={inputCls} type="number" value={minSpend} onChange={(e) => setMinSpend(Number(e.target.value))} />
          </div>
          <div>
            <label className={labelCls}>Points multiplier</label>
            <input className={inputCls} type="number" step="0.25" value={mult} onChange={(e) => setMult(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Accent color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-12 rounded border border-black/10" />
            <input className={inputCls + " flex-1"} value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Perks (one per line)</label>
          <textarea className={inputCls + " h-32 py-2"} value={perks} onChange={(e) => setPerks(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Tier is active
        </label>
      </div>
    </DrawerShell>
  );
}

function RewardEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const src = useClub((s) => id ? s.rewards.find((r) => r.id === id) ?? null : null);
  const createReward = useClub((s) => s.createReward);
  const updateReward = useClub((s) => s.updateReward);

  const [title, setTitle] = useState(src?.title ?? "");
  const [description, setDescription] = useState(src?.description ?? "");
  const [cost, setCost] = useState(src?.cost ?? 500);
  const [category, setCategory] = useState<ClubReward["category"]>(src?.category ?? "credit");
  const [tiers, setTiers] = useState<CustomerTier[]>(src?.eligibleTiers ?? ["Standard", "Silver", "Gold", "Signature"]);
  const [stock, setStock] = useState<string>(src?.stock == null ? "" : String(src.stock));
  const [active, setActive] = useState(src?.active ?? true);

  function toggleTier(t: CustomerTier) {
    setTiers((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]);
  }
  function save() {
    const payload = {
      title: title.trim() || "Untitled reward",
      description: description.trim(),
      cost: Number(cost) || 0,
      category,
      eligibleTiers: tiers,
      stock: stock.trim() === "" ? null : Number(stock),
      active,
    };
    if (id) updateReward(id, payload); else createReward(payload);
    onClose();
  }

  return (
    <DrawerShell
      title={id ? "Edit reward" : "New reward"}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-black/10 text-sm">Cancel</button>
          <button onClick={save} className="h-9 px-4 rounded-lg bg-ink text-white text-sm inline-flex items-center gap-1.5"><Save className="h-4 w-4" /> {id ? "Save reward" : "Create reward"}</button>
        </>
      }
    >
      <div className="space-y-4">
        <div><label className={labelCls}>Title</label><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Free Express Shipping" /></div>
        <div><label className={labelCls}>Description</label><textarea className={inputCls + " h-20 py-2"} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Category</label>
            <select className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as any)}>
              {Object.entries(CAT_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Point cost</label>
            <input className={inputCls} type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Eligible tiers</label>
          <div className="flex flex-wrap gap-1.5">
            {(["Standard", "Silver", "Gold", "Signature"] as CustomerTier[]).map((t) => {
              const on = tiers.includes(t);
              return (
                <button key={t} onClick={() => toggleTier(t)} className={`text-xs px-2.5 h-7 rounded-full border ${on ? "bg-ink text-white border-ink" : "bg-white border-black/10 text-ink hover:bg-black/5"}`}>{t}</button>
              );
            })}
          </div>
        </div>
        <div>
          <label className={labelCls}>Stock (leave empty for unlimited)</label>
          <input className={inputCls} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Unlimited" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Reward is live
        </label>
      </div>
    </DrawerShell>
  );
}

function RulesEditor({ onClose }: { onClose: () => void }) {
  const rules = useClub((s) => s.rules);
  const updateRules = useClub((s) => s.updateRules);
  const [draft, setDraft] = useState<ClubRule>(rules);

  const fields: Array<{ key: keyof ClubRule; label: string; suffix?: string }> = [
    { key: "earnPerNaira", label: "Points per ₦1,000 spent" },
    { key: "pointValueNaira", label: "₦ value per point (redemption)", suffix: "₦" },
    { key: "signupBonus", label: "Sign-up bonus", suffix: "pts" },
    { key: "birthdayBonus", label: "Birthday bonus", suffix: "pts" },
    { key: "referralBonus", label: "Referral bonus", suffix: "pts" },
    { key: "reviewBonus", label: "Verified review bonus", suffix: "pts" },
    { key: "expiryMonths", label: "Point expiry (months)" },
  ];

  return (
    <DrawerShell
      title="Program rules"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="h-9 px-3 rounded-lg border border-black/10 text-sm">Cancel</button>
          <button onClick={() => { updateRules(draft); onClose(); }} className="h-9 px-4 rounded-lg bg-ink text-white text-sm inline-flex items-center gap-1.5"><Save className="h-4 w-4" /> Save rules</button>
        </>
      }
    >
      <div className="space-y-3">
        {fields.map((f) => (
          <div key={f.key} className="grid grid-cols-[1fr,140px] items-center gap-3">
            <label className="text-sm text-ink">{f.label}</label>
            <div className="relative">
              <input className={inputCls} type="number" value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: Number(e.target.value) })} />
              {f.suffix && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">{f.suffix}</span>}
            </div>
          </div>
        ))}
        <div className="mt-4 p-3 rounded-lg bg-gold/10 border border-gold/20 text-[12px] text-gold-deep">
          Example: at {draft.earnPerNaira} pt per ₦1,000, a ₦250,000 order earns <b>{Math.floor(250)}</b> base points.
          Signature members earn <b>{Math.floor(250 * 3)}</b> points at 3× multiplier. Redeeming 400 pts = <b>₦{(400 * draft.pointValueNaira).toLocaleString()}</b> credit.
        </div>
      </div>
    </DrawerShell>
  );
}

// ============ Page ============
export function AdminClub() {
  const tiers = useClub((s) => s.tiers);
  const rewards = useClub((s) => s.rewards);
  const rules = useClub((s) => s.rules);
  const ledger = useClub((s) => s.ledger);
  const hydrate = useClub((s) => s.hydrate);
  const removeReward = useClub((s) => s.removeReward);
  const duplicateReward = useClub((s) => s.duplicateReward);
  const updateReward = useClub((s) => s.updateReward);
  const customers = useCustomers((s) => s.customers);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const [drawer, setDrawer] = useState<Drawer>({ kind: "closed" });
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | ClubReward["category"]>("all");

  const tierMetrics = useMemo(() => {
    const m: Record<CustomerTier, { count: number; spend: number }> = {
      Standard: { count: 0, spend: 0 }, Silver: { count: 0, spend: 0 },
      Gold: { count: 0, spend: 0 }, Signature: { count: 0, spend: 0 },
    };
    customers.forEach((c) => { m[c.tier].count++; m[c.tier].spend += c.spend; });
    return m;
  }, [customers]);

  const totalPoints = useMemo(() => customers.reduce((a, c) => a + c.loyaltyPoints, 0), [customers]);
  const totalRedeemed = useMemo(() => rewards.reduce((a, r) => a + r.redeemed, 0), [rewards]);
  const outstandingLiability = totalPoints * rules.pointValueNaira;

  const filteredRewards = useMemo(() => {
    return rewards
      .filter((r) => catFilter === "all" || r.category === catFilter)
      .filter((r) => !q || r.title.toLowerCase().includes(q.toLowerCase()) || r.description.toLowerCase().includes(q.toLowerCase()));
  }, [rewards, catFilter, q]);

  function exportCSV() {
    downloadCSV("asl-club-rewards.csv", rewards.map((r) => ({
      id: r.id, title: r.title, category: r.category, cost: r.cost,
      redeemed: r.redeemed, stock: r.stock ?? "unlimited",
      tiers: r.eligibleTiers.join("|"), active: r.active,
    })));
  }

  return (
    <div className="p-6 space-y-5">
      <PageHeader
        title="ASL Club"
        subtitle="Loyalty tiers, points rules and the reward catalogue that powers member retention."
        actions={
          <>
            <button onClick={exportCSV} className="h-9 px-3 rounded-lg border border-black/10 text-sm hover:bg-black/5 inline-flex items-center gap-1.5">
              <Download className="h-4 w-4" /> Export
            </button>
            <button onClick={() => setDrawer({ kind: "rules" })} className="h-9 px-3 rounded-lg border border-black/10 text-sm hover:bg-black/5 inline-flex items-center gap-1.5">
              <Coins className="h-4 w-4" /> Program rules
            </button>
            <button onClick={() => setDrawer({ kind: "reward", id: null })} className="h-9 px-3 rounded-lg bg-ink text-white text-sm inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4" /> New reward
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Members" value={String(customers.length)} sub={`${tierMetrics.Signature.count + tierMetrics.Gold.count} VIP tier`} icon={Users} accent="#0B57D0" />
        <Kpi label="Points outstanding" value={totalPoints.toLocaleString()} sub={`${fmtShort(outstandingLiability)} liability`} icon={Coins} accent="#B8862B" />
        <Kpi label="Rewards" value={String(rewards.length)} sub={`${rewards.filter((r) => r.active).length} live`} icon={Gift} accent="#7C3AED" />
        <Kpi label="Redeemed (all-time)" value={totalRedeemed.toLocaleString()} sub="Across all rewards" icon={TrendingUp} accent="#0F5F4A" />
      </div>

      {/* Tiers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-[16px]">Tiers</div>
          <div className="text-[11px] text-muted-foreground">Multipliers apply to base points earned per order.</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <TierCard
              key={t.id}
              tier={t}
              memberCount={tierMetrics[t.id].count}
              spendTotal={tierMetrics[t.id].spend}
              onEdit={() => setDrawer({ kind: "tier", id: t.id })}
            />
          ))}
        </div>
      </div>

      {/* Rewards */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-[16px]">Reward catalogue</div>
        </div>
        <Toolbar>
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rewards…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-black/10 text-sm bg-white" />
          </div>
          <div className="inline-flex rounded-lg border border-black/10 overflow-hidden text-xs">
            <button onClick={() => setCatFilter("all")} className={`px-3 h-9 ${catFilter === "all" ? "bg-ink text-white" : "bg-white hover:bg-black/5"}`}>All</button>
            {Object.entries(CAT_META).map(([k, v]) => (
              <button key={k} onClick={() => setCatFilter(k as any)} className={`px-3 h-9 ${catFilter === k ? "bg-ink text-white" : "bg-white hover:bg-black/5"}`}>{v.label}</button>
            ))}
          </div>
          <div className="ml-auto text-xs text-muted-foreground">{filteredRewards.length} shown</div>
        </Toolbar>

        {filteredRewards.length === 0 ? (
          <Empty title="No rewards" sub="Adjust filters or create a new reward." />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRewards.map((r) => (
              <RewardCard
                key={r.id}
                reward={r}
                onEdit={() => setDrawer({ kind: "reward", id: r.id })}
                onDuplicate={() => duplicateReward(r.id)}
                onRemove={() => { if (confirm(`Delete "${r.title}"?`)) removeReward(r.id); }}
                onToggle={() => updateReward(r.id, { active: !r.active })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Ledger */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="font-display text-[16px]">Recent points activity</div>
          <div className="text-[11px] text-muted-foreground">Latest 20 events</div>
        </div>
        <Card padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground bg-black/[0.02]">
                <tr>
                  <th className="text-left font-medium px-4 py-2.5">Customer</th>
                  <th className="text-left font-medium px-4 py-2.5">Tier</th>
                  <th className="text-left font-medium px-4 py-2.5">Reason</th>
                  <th className="text-right font-medium px-4 py-2.5">Points</th>
                  <th className="text-right font-medium px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody>
                {ledger.slice(0, 20).map((e) => {
                  const pos = e.delta >= 0;
                  return (
                    <tr key={e.id} className="border-t border-black/5 hover:bg-black/[0.02]">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-ink">{e.customerName}</div>
                        <div className="text-[11px] text-muted-foreground">{e.customerId}</div>
                      </td>
                      <td className="px-4 py-2.5"><Chip tone={e.tier === "Signature" ? "gold" : e.tier === "Gold" ? "amber" : e.tier === "Silver" ? "slate" : "neutral"}>{e.tier}</Chip></td>
                      <td className="px-4 py-2.5 text-ink/80">{e.reason}</td>
                      <td className={`px-4 py-2.5 text-right font-sans text-[13px] ${pos ? "text-ink" : "text-rose-700"}`}>
                        <span className="inline-flex items-center gap-1">
                          {pos ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {pos ? "+" : ""}{e.delta}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-[11px] text-muted-foreground">{timeAgo(e.at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {drawer.kind === "tier" && <TierEditor tierId={drawer.id} onClose={() => setDrawer({ kind: "closed" })} />}
      {drawer.kind === "reward" && <RewardEditor id={drawer.id} onClose={() => setDrawer({ kind: "closed" })} />}
      {drawer.kind === "rules" && <RulesEditor onClose={() => setDrawer({ kind: "closed" })} />}
    </div>
  );
}
