import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, StatusPill, Toolbar } from "./ui";
import {
  useBanners, type Banner, type BannerPlacement, type BannerStatus,
  type BannerDevice, type BannerAudience, type BannerStyle,
} from "@/lib/banners-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Flag, Plus, Download, Search, X, Check, Trash2, Copy,
  Play, Pause, Archive, ArrowUp, ArrowDown, ExternalLink, Eye, MousePointerClick,
  Monitor, Smartphone, Crown, User, Users, Sparkles, Gift, Truck, Flame,
  ShoppingBag, MessageSquare, Layers, ShoppingCart, X as XIcon,
} from "lucide-react";

const PLACEMENTS: { id: BannerPlacement; label: string; sub: string; Icon: typeof Flag }[] = [
  { id: "top_bar", label: "Top bar", sub: "Site-wide announcement strip", Icon: Layers },
  { id: "checkout", label: "Checkout", sub: "Above checkout summary", Icon: ShoppingBag },
  { id: "cart_nudge", label: "Cart nudge", sub: "Inside the cart drawer", Icon: ShoppingCart },
  { id: "category_ribbon", label: "Category ribbon", sub: "Top of category pages", Icon: Flag },
  { id: "product_ribbon", label: "Product ribbon", sub: "Above product cards", Icon: Flag },
  { id: "concierge_strip", label: "Concierge strip", sub: "Sourcing / concierge surfaces", Icon: MessageSquare },
];

const STATUS_LABEL: Record<BannerStatus, string> = {
  live: "Live", scheduled: "Scheduled", paused: "Paused", draft: "Draft", expired: "Expired",
};

const AUDIENCE_META: Record<BannerAudience, { label: string; Icon: typeof User }> = {
  all: { label: "Everyone", Icon: Users },
  guest: { label: "Guests", Icon: User },
  member: { label: "Members", Icon: Users },
  vip: { label: "VIP", Icon: Crown },
};

const ICONS = {
  sparkles: Sparkles, gift: Gift, truck: Truck, flame: Flame, crown: Crown, none: null,
} as const;

export function AdminBanners() {
  const { banners, hydrate, update, remove, duplicate, setStatus, move, create } = useBanners();
  const [placement, setPlacement] = useState<BannerPlacement>("top_bar");
  const [status, setStatusFilter] = useState<"all" | BannerStatus>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const list = useMemo(() => banners
    .filter((b) => b.placement === placement)
    .filter((b) => status === "all" ? true : b.status === status)
    .filter((b) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [b.name, b.message].some((v) => v.toLowerCase().includes(query));
    })
    .sort((a, b) => a.priority - b.priority),
    [banners, placement, status, q]);

  const kpis = useMemo(() => {
    const scoped = banners.filter((b) => b.placement === placement);
    const impressions = scoped.reduce((s, x) => s + x.impressions, 0);
    const clicks = scoped.reduce((s, x) => s + x.clicks, 0);
    const dismissals = scoped.reduce((s, x) => s + x.dismissals, 0);
    return {
      live: scoped.filter((s) => s.status === "live").length,
      impressions,
      clicks,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      dismissRate: impressions ? (dismissals / impressions) * 100 : 0,
    };
  }, [banners, placement]);

  const open = banners.find((b) => b.id === openId) || null;

  const exportCSV = () => downloadCSV(`banners-${placement}.csv`, list.map((b) => ({
    Name: b.name, Placement: b.placement, Priority: b.priority, Status: b.status,
    Device: b.device, Audience: b.audience, Message: b.message, CTA: b.cta ?? "",
    Link: b.linkTo ?? "", Dismissible: b.dismissible ? "Yes" : "No",
    Impressions: b.impressions, Clicks: b.clicks, Dismissals: b.dismissals,
    CTR: b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(2) + "%" : "0%",
    Starts: b.startsAt.slice(0, 10), Ends: b.endsAt?.slice(0, 10) ?? "",
  })));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Banners"
        subtitle="Thin promotional strips: announcement bar, cart nudges, category ribbons and concierge messaging."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New banner
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-5">
        {/* Placement rail */}
        <aside className="space-y-1.5">
          {PLACEMENTS.map((p) => {
            const count = banners.filter((b) => b.placement === p.id).length;
            const live = banners.filter((b) => b.placement === p.id && b.status === "live").length;
            const active = placement === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPlacement(p.id)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  active ? "border-ink bg-ink text-white" : "border-black/[0.08] bg-white hover:bg-black/[0.03]"
                }`}
              >
                <div className="flex items-center gap-2">
                  <p.Icon className="h-4 w-4" />
                  <div className="font-display font-bold text-[13px]">{p.label}</div>
                  <span className={`ml-auto text-[10.5px] font-semibold px-1.5 rounded-full ${
                    active ? "bg-white/15" : "bg-black/[0.06] text-muted-foreground"
                  }`}>{count}</span>
                </div>
                <div className={`text-[11px] mt-1 ${active ? "text-white/70" : "text-muted-foreground"}`}>{p.sub}</div>
                <div className={`text-[10.5px] mt-1 flex items-center gap-1 ${active ? "text-white/70" : "text-ink"}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-white" : "bg-ink"}`} />
                  {live} live
                </div>
              </button>
            );
          })}
        </aside>

        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPI label="Live in placement" value={kpis.live.toLocaleString()} Icon={Play} tone="text-ink" />
            <KPI label="Impressions" value={kpis.impressions.toLocaleString()} Icon={Eye} />
            <KPI label="CTR" value={`${kpis.ctr.toFixed(2)}%`} Icon={MousePointerClick} />
            <KPI label="Dismiss rate" value={`${kpis.dismissRate.toFixed(2)}%`} Icon={XIcon} />
          </div>

          <Toolbar>
            <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search banner name, message…"
                className="flex-1 bg-transparent outline-none text-[13px]"
              />
              {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
            </div>
            <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
              <select value={status} onChange={(e) => setStatusFilter(e.target.value as "all" | BannerStatus)} className="bg-transparent outline-none pr-1">
                <option value="all">All statuses</option>
                {(Object.keys(STATUS_LABEL) as BannerStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                ))}
              </select>
            </div>
            <div className="ml-auto text-[12px] text-muted-foreground">
              {list.length} banner{list.length === 1 ? "" : "s"} · sorted by priority
            </div>
          </Toolbar>

          {list.length === 0 ? (
            <Card><Empty title="No banners here" sub="Create one to publish content in this placement." /></Card>
          ) : (
            <div className="space-y-3">
              {list.map((b, i) => (
                <BannerRow
                  key={b.id}
                  banner={b}
                  isFirst={i === 0}
                  isLast={i === list.length - 1}
                  onOpen={() => setOpenId(b.id)}
                  onMove={(dir) => move(b.id, dir)}
                  onSetStatus={(s) => setStatus(b.id, s)}
                  onDuplicate={() => { void duplicate(b.id).then((c) => { if (c) setOpenId(c.id); }); }}
                  onDelete={() => { if (confirm(`Delete "${b.name}"?`)) void remove(b.id); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {open && (
        <BannerDrawer
          key={open.id}
          banner={open}
          onClose={() => setOpenId(null)}
          onSave={(patch) => update(open.id, patch)}
          onSetStatus={(s) => setStatus(open.id, s)}
          onDuplicate={() => { void duplicate(open.id).then((c) => { if (c) setOpenId(c.id); }); }}
          onDelete={() => { if (confirm("Delete this banner?")) { void remove(open.id); setOpenId(null); } }}
        />
      )}

      {showNew && (
        <NewBannerModal
          defaultPlacement={placement}
          onClose={() => setShowNew(false)}
          onCreate={(payload) => {
            void create(payload).then((b) => {
              setShowNew(false);
              setOpenId(b.id);
            });
          }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof Flag; tone?: string }) {
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

function BannerRow({
  banner, isFirst, isLast, onOpen, onMove, onSetStatus, onDuplicate, onDelete,
}: {
  banner: Banner;
  isFirst: boolean;
  isLast: boolean;
  onOpen: () => void;
  onMove: (dir: "up" | "down") => void;
  onSetStatus: (s: BannerStatus) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const aud = AUDIENCE_META[banner.audience];
  const ctr = banner.impressions ? (banner.clicks / banner.impressions) * 100 : 0;

  return (
    <Card padded={false} className="overflow-hidden">
      <BannerPreview banner={banner} />
      <div className="p-3.5 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <IconButton onClick={() => onMove("up")} title="Priority up" active={false}>
            <ArrowUp className={`h-3.5 w-3.5 ${isFirst ? "opacity-30" : ""}`} />
          </IconButton>
          <IconButton onClick={() => onMove("down")} title="Priority down">
            <ArrowDown className={`h-3.5 w-3.5 ${isLast ? "opacity-30" : ""}`} />
          </IconButton>
          <div className="text-[11px] font-semibold text-muted-foreground w-8 text-center tabular-nums">#{banner.priority}</div>
        </div>

        <div className="min-w-0 flex-1">
          <button onClick={onOpen} className="font-display font-bold text-[13.5px] hover:underline text-left">{banner.name}</button>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <StatusPill status={STATUS_LABEL[banner.status]} />
            <Chip tone="neutral"><aud.Icon className="h-3 w-3" /> {aud.label}</Chip>
            {banner.device !== "all" && (
              <Chip tone="slate">
                {banner.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                {banner.device === "mobile" ? "Mobile" : "Desktop"}
              </Chip>
            )}
            {banner.dismissible && <Chip tone="neutral"><XIcon className="h-3 w-3" /> Dismissible</Chip>}
            {banner.endsAt && <Chip tone="amber">Ends {new Date(banner.endsAt).toLocaleDateString()}</Chip>}
          </div>
        </div>

        <div className="hidden md:grid grid-cols-3 gap-2 text-center min-w-[220px]">
          <MiniStat label="Impr." value={banner.impressions.toLocaleString()} />
          <MiniStat label="CTR" value={`${ctr.toFixed(2)}%`} />
          <MiniStat label="Dismiss" value={banner.dismissals.toLocaleString()} />
        </div>

        <div className="flex items-center gap-1.5">
          {banner.status === "live" ? (
            <button onClick={() => onSetStatus("paused")} className="h-8 px-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[11.5px] font-semibold flex items-center gap-1">
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          ) : (
            <button onClick={() => onSetStatus("live")} className="h-8 px-2.5 rounded-md border border-border bg-muted text-ink text-[11.5px] font-semibold flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> Publish
            </button>
          )}
          <IconButton onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></IconButton>
          <button onClick={onOpen} className="h-8 px-3 rounded-md bg-ink text-white text-[11.5px] font-semibold hover:bg-black">Edit</button>
          <IconButton onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      </div>
    </Card>
  );
}

function BannerPreview({ banner }: { banner: Banner }) {
  const Icon = banner.icon && banner.icon !== "none" ? ICONS[banner.icon] : null;
  const bgStyle: React.CSSProperties = banner.style === "gradient"
    ? { background: `linear-gradient(90deg, ${banner.bg} 0%, ${mix(banner.bg, banner.accent, 0.4)} 100%)`, color: banner.fg }
    : banner.style === "outline"
      ? { background: banner.bg, color: banner.fg, boxShadow: `inset 0 0 0 1px ${banner.accent}55` }
      : { background: banner.bg, color: banner.fg };

  return (
    <div className="h-11 px-4 flex items-center gap-3 text-[12.5px]" style={bgStyle}>
      {Icon && <Icon className="h-4 w-4 shrink-0" style={{ color: banner.accent }} />}
      <div className="flex-1 truncate font-medium">{banner.message}</div>
      {banner.cta && (
        <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap"
              style={{ background: banner.accent, color: isDarkColor(banner.accent) ? banner.fg : banner.bg }}>
          {banner.cta}
        </span>
      )}
      {banner.dismissible && <XIcon className="h-3.5 w-3.5 opacity-60 shrink-0" />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-1">
      <div className="font-display text-[12.5px] leading-tight">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function BannerDrawer({
  banner, onClose, onSave, onSetStatus, onDuplicate, onDelete,
}: {
  banner: Banner;
  onClose: () => void;
  onSave: (patch: Partial<Banner>) => void;
  onSetStatus: (s: BannerStatus) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({ ...banner });
  const [saved, setSaved] = useState(false);
  const patch = <K extends keyof Banner>(k: K, v: Banner[K]) => setForm({ ...form, [k]: v });
  const save = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const ctr = banner.impressions ? (banner.clicks / banner.impressions) * 100 : 0;
  const dismissRate = banner.impressions ? (banner.dismissals / banner.impressions) * 100 : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Banner · {form.placement.replace("_", " ")}</div>
            <div className="font-display font-bold text-[15px] leading-tight truncate">{form.name}</div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {banner.status !== "live" && (
              <button onClick={() => onSetStatus("live")} className="h-8 px-3 rounded-md border border-border bg-muted text-ink text-[12px] font-semibold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Publish
              </button>
            )}
            {banner.status === "live" && (
              <button onClick={() => onSetStatus("paused")} className="h-8 px-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-semibold flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            <button onClick={() => onSetStatus("expired")} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
            <button onClick={onDuplicate} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          </div>

          <Section title="Live preview">
            <Card padded={false} className="overflow-hidden">
              <BannerPreview banner={form} />
            </Card>
            <div className="text-[11px] text-muted-foreground mt-1.5">Preview updates as you edit content and look.</div>
          </Section>

          <Section title="Basics">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Name (internal)" value={form.name} onChange={(v) => patch("name", v)} span={2} />
              <Select label="Placement" value={form.placement} onChange={(v) => patch("placement", v as BannerPlacement)} options={PLACEMENTS.map((p) => ({ value: p.id, label: p.label }))} />
              <NumberField label="Priority" value={form.priority} onChange={(v) => patch("priority", v)} />
            </div>
          </Section>

          <Section title="Message">
            <div className="grid grid-cols-2 gap-2.5">
              <label className="col-span-2 block">
                <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Message</div>
                <textarea
                  value={form.message}
                  onChange={(e) => patch("message", e.target.value)}
                  rows={2}
                  className="w-full text-[13px] rounded-md border border-black/10 bg-white px-2.5 py-2 outline-none focus:border-ink resize-none"
                />
              </label>
              <Field label="CTA label" value={form.cta ?? ""} onChange={(v) => patch("cta", v)} />
              <Field label="Link to" value={form.linkTo ?? ""} onChange={(v) => patch("linkTo", v)} />
              <Select label="Icon" value={form.icon ?? "none"} onChange={(v) => patch("icon", v as Banner["icon"])} options={[
                { value: "none", label: "None" },
                { value: "sparkles", label: "Sparkles" },
                { value: "gift", label: "Gift" },
                { value: "truck", label: "Truck" },
                { value: "flame", label: "Flame" },
                { value: "crown", label: "Crown" },
              ]} />
              <label className="flex items-center gap-2 h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-medium">
                <input type="checkbox" checked={form.dismissible} onChange={(e) => patch("dismissible", e.target.checked)} className="accent-ink" />
                Dismissible
              </label>
            </div>
          </Section>

          <Section title="Look">
            <div className="grid grid-cols-3 gap-2.5">
              <ColorField label="Background" value={form.bg} onChange={(v) => patch("bg", v)} />
              <ColorField label="Text" value={form.fg} onChange={(v) => patch("fg", v)} />
              <ColorField label="Accent" value={form.accent} onChange={(v) => patch("accent", v)} />
              <Select label="Style" value={form.style} onChange={(v) => patch("style", v as BannerStyle)} options={[
                { value: "solid", label: "Solid" },
                { value: "gradient", label: "Gradient" },
                { value: "outline", label: "Outline" },
              ]} />
            </div>
          </Section>

          <Section title="Targeting">
            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Device" value={form.device} onChange={(v) => patch("device", v as BannerDevice)} options={[
                { value: "all", label: "All devices" },
                { value: "mobile", label: "Mobile only" },
                { value: "desktop", label: "Desktop only" },
              ]} />
              <Select label="Audience" value={form.audience} onChange={(v) => patch("audience", v as BannerAudience)} options={[
                { value: "all", label: "Everyone" },
                { value: "guest", label: "Guests" },
                { value: "member", label: "Members" },
                { value: "vip", label: "VIP / Signature" },
              ]} />
            </div>
          </Section>

          <Section title="Schedule">
            <div className="grid grid-cols-2 gap-2.5">
              <DateField label="Starts" value={form.startsAt} onChange={(v) => patch("startsAt", v)} />
              <DateField label="Ends" value={form.endsAt ?? ""} onChange={(v) => patch("endsAt", v || undefined)} />
            </div>
          </Section>

          <Section title="Performance">
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="Impressions" value={banner.impressions.toLocaleString()} />
              <Stat label="Clicks" value={banner.clicks.toLocaleString()} />
              <Stat label="CTR" value={`${ctr.toFixed(2)}%`} />
              <Stat label="Dismissed" value={`${dismissRate.toFixed(2)}%`} />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value)}
              rows={3}
              placeholder="Approval context, campaign owner, dependencies…"
              className="w-full text-[13px] rounded-md border border-black/10 bg-white px-3 py-2 outline-none focus:border-ink resize-none"
            />
          </Section>

          {form.linkTo && (
            <a href={form.linkTo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-ink">
              <ExternalLink className="h-3.5 w-3.5" /> Open destination
            </a>
          )}
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

function NewBannerModal({
  defaultPlacement, onClose, onCreate,
}: {
  defaultPlacement: BannerPlacement;
  onClose: () => void;
  onCreate: (payload: Omit<Banner, "id" | "impressions" | "clicks" | "dismissals" | "createdAt" | "updatedAt">) => void;
}) {
  const [name, setName] = useState("");
  const [placement, setPlacement] = useState<BannerPlacement>(defaultPlacement);
  const [message, setMessage] = useState("");

  const submit = () => {
    if (!name.trim() || !message.trim()) return;
    onCreate({
      name: name.trim(),
      placement,
      priority: 99,
      status: "draft",
      device: "all",
      audience: "all",
      style: "solid",
      message: message.trim(),
      bg: "#0f0f0f", fg: "#faf6ea", accent: "#c9a86a",
      dismissible: true, icon: "sparkles",
      startsAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="h-12 px-4 border-b border-black/[0.08] flex items-center justify-between">
            <div className="font-display font-bold text-[15px]">New banner</div>
            <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
          </div>
          <div className="p-4 space-y-3">
            <Field label="Banner name" value={name} onChange={setName} span={2} />
            <Select label="Placement" value={placement} onChange={(v) => setPlacement(v as BannerPlacement)} options={PLACEMENTS.map((p) => ({ value: p.id, label: p.label }))} />
            <label className="block">
              <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Message</div>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2}
                className="w-full text-[13px] rounded-md border border-black/10 bg-white px-2.5 py-2 outline-none focus:border-ink resize-none" />
            </label>
            <div className="text-[11.5px] text-muted-foreground">Created as draft. Style and schedule next.</div>
          </div>
          <div className="border-t border-black/[0.08] p-3 flex items-center gap-2">
            <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
            <button onClick={submit} disabled={!name.trim() || !message.trim()} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-40 flex items-center gap-1.5">
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

function Field({ label, value, onChange, span = 1 }: { label: string; value: string; onChange: (v: string) => void; span?: 1 | 2 }) {
  return (
    <label className={`block ${span === 2 ? "col-span-2" : ""}`}>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink" />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] tabular-nums outline-none focus:border-ink" />
    </label>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const dt = value ? new Date(value).toISOString().slice(0, 10) : "";
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input type="date" value={dt}
        onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink" />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2 text-[13px] outline-none focus:border-ink">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 rounded border border-black/10 cursor-pointer" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent outline-none text-[12px] font-sans uppercase min-w-0" />
      </div>
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-2.5">
      <div className="font-display text-[14px] leading-tight">{value}</div>
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mt-0.5">{label}</div>
    </div>
  );
}

function isDarkColor(hex: string) {
  const m = hex.replace("#", "");
  if (m.length !== 6) return true;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.55;
}

function mix(a: string, b: string, t: number) {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  if (pa.length !== 6 || pb.length !== 6) return a;
  const r = Math.round(parseInt(pa.slice(0, 2), 16) * (1 - t) + parseInt(pb.slice(0, 2), 16) * t);
  const g = Math.round(parseInt(pa.slice(2, 4), 16) * (1 - t) + parseInt(pb.slice(2, 4), 16) * t);
  const bl = Math.round(parseInt(pa.slice(4, 6), 16) * (1 - t) + parseInt(pb.slice(4, 6), 16) * t);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
