import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, IconButton, StatusPill, Toolbar, naira } from "./ui";
import {
  useSlots, type Slot, type SlotPage, type SlotStatus, type SlotType, type SlotDevice, type SlotAudience,
} from "@/lib/slots-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Palette, Plus, Download, Search, X, Check, Trash2, Copy, Pin, PinOff,
  Play, Pause, Archive, ArrowUp, ArrowDown, ExternalLink, Eye, MousePointerClick,
  TrendingUp, Monitor, Smartphone, Crown, User, Users,
  LayoutTemplate, Image as ImageIcon, Layers, Newspaper, Timer, Clock,
} from "lucide-react";

const PAGES: { id: SlotPage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "shop", label: "Shop" },
  { id: "sales", label: "Sales" },
  { id: "concierge", label: "Concierge" },
  { id: "brands", label: "Brands" },
];

const TYPE_META: Record<SlotType, { label: string; Icon: typeof Palette }> = {
  hero: { label: "Hero", Icon: LayoutTemplate },
  banner: { label: "Banner", Icon: ImageIcon },
  grid: { label: "Grid", Icon: Layers },
  carousel: { label: "Carousel", Icon: Layers },
  editorial: { label: "Editorial", Icon: Newspaper },
  countdown: { label: "Countdown", Icon: Timer },
};

const STATUS_LABEL: Record<SlotStatus, string> = {
  live: "Live", scheduled: "Scheduled", paused: "Paused", draft: "Draft", expired: "Expired",
};

const AUDIENCE_META: Record<SlotAudience, { label: string; Icon: typeof User }> = {
  all: { label: "Everyone", Icon: Users },
  guest: { label: "Guests", Icon: User },
  member: { label: "Members", Icon: Users },
  vip: { label: "VIP", Icon: Crown },
};

export function AdminSlots() {
  const { slots, hydrate, update, remove, duplicate, setStatus, togglePin, move, create } = useSlots();
  const [page, setPage] = useState<SlotPage>("home");
  const [status, setStatusFilter] = useState<"all" | SlotStatus>("all");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const forPage = useMemo(() => slots
    .filter((s) => s.page === page)
    .filter((s) => status === "all" ? true : s.status === status)
    .filter((s) => {
      const query = q.trim().toLowerCase();
      if (!query) return true;
      return [s.name, s.headline, s.subhead].filter(Boolean).some((v) => String(v).toLowerCase().includes(query));
    })
    .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || a.position - b.position),
    [slots, page, status, q]);

  const kpis = useMemo(() => {
    const pageSlots = slots.filter((s) => s.page === page);
    const impressions = pageSlots.reduce((s, x) => s + x.impressions, 0);
    const clicks = pageSlots.reduce((s, x) => s + x.clicks, 0);
    return {
      live: pageSlots.filter((s) => s.status === "live").length,
      scheduled: pageSlots.filter((s) => s.status === "scheduled").length,
      impressions,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      revenue: pageSlots.reduce((s, x) => s + x.revenue, 0),
    };
  }, [slots, page]);

  const openSlot = slots.find((s) => s.id === openId) || null;

  const exportCSV = () => downloadCSV(`slots-${page}.csv`, forPage.map((s) => ({
    Name: s.name, Page: s.page, Position: s.position, Type: s.type, Status: s.status,
    Device: s.device, Audience: s.audience, Headline: s.headline, Subhead: s.subhead ?? "",
    CTA: s.cta ?? "", Link: s.linkTo ?? "",
    Impressions: s.impressions, Clicks: s.clicks, CTR: s.impressions ? ((s.clicks / s.impressions) * 100).toFixed(2) + "%" : "0%",
    Revenue: s.revenue, Starts: s.startsAt.slice(0, 10), Ends: s.endsAt?.slice(0, 10) ?? "",
  })));

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Homepage Slots"
        subtitle="Curate what appears on the home, shop, sales and concierge surfaces across mobile and desktop."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button onClick={() => setShowNew(true)} className="h-9 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New slot
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-1 border-b border-black/[0.08] mb-4 overflow-x-auto no-scrollbar">
        {PAGES.map((p) => {
          const count = slots.filter((s) => s.page === p.id).length;
          return (
            <button
              key={p.id}
              onClick={() => setPage(p.id)}
              className={`px-3 h-9 text-[12.5px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
                page === p.id ? "border-ink text-ink" : "border-transparent text-muted-foreground hover:text-ink"
              }`}
            >
              {p.label} <span className="ml-1 text-[11px] text-muted-foreground">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <KPI label="Live on page" value={kpis.live.toLocaleString()} Icon={Play} tone="text-ink" />
        <KPI label="Scheduled" value={kpis.scheduled.toLocaleString()} Icon={Clock} />
        <KPI label="Impressions" value={kpis.impressions.toLocaleString()} Icon={Eye} />
        <KPI label="CTR" value={`${kpis.ctr.toFixed(2)}%`} Icon={MousePointerClick} />
        <KPI label="Revenue" value={naira(kpis.revenue)} Icon={TrendingUp} tone="text-ink" />
      </div>

      <Toolbar>
        <div className="flex-1 min-w-[220px] max-w-md h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search slot name, headline…"
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
          {q && <button onClick={() => setQ("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
        </div>
        <div className="h-9 px-2.5 flex items-center gap-1.5 rounded-md border border-black/10 bg-white text-[12.5px]">
          <select value={status} onChange={(e) => setStatusFilter(e.target.value as "all" | SlotStatus)} className="bg-transparent outline-none pr-1">
            <option value="all">All statuses</option>
            {(Object.keys(STATUS_LABEL) as SlotStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto text-[12px] text-muted-foreground">{forPage.length} slot{forPage.length === 1 ? "" : "s"}</div>
      </Toolbar>

      {forPage.length === 0 ? (
        <Card><Empty title="No slots yet" sub="Create a new slot to publish content on this surface." /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {forPage.map((s) => (
            <SlotCard
              key={s.id}
              slot={s}
              onOpen={() => setOpenId(s.id)}
              onMove={(dir) => move(s.id, dir)}
              onSetStatus={(next) => setStatus(s.id, next)}
              onTogglePin={() => togglePin(s.id)}
              onDuplicate={() => { void duplicate(s.id).then((c) => { if (c) setOpenId(c.id); }); }}
              onDelete={() => { if (confirm(`Delete "${s.name}"?`)) void remove(s.id); }}
            />
          ))}
        </div>
      )}

      {openSlot && (
        <SlotDrawer
          key={openSlot.id}
          slot={openSlot}
          onClose={() => setOpenId(null)}
          onSave={(patch) => void update(openSlot.id, patch)}
          onSetStatus={(s) => void setStatus(openSlot.id, s)}
          onDuplicate={() => { void duplicate(openSlot.id).then((c) => { if (c) setOpenId(c.id); }); }}
          onTogglePin={() => void togglePin(openSlot.id)}
          onDelete={() => { if (confirm("Delete this slot?")) { void remove(openSlot.id); setOpenId(null); } }}
        />
      )}

      {showNew && (
        <NewSlotModal
          defaultPage={page}
          onClose={() => setShowNew(false)}
          onCreate={(payload) => {
            void create(payload).then((s) => {
              setShowNew(false);
              setOpenId(s.id);
            });
          }}
        />
      )}
    </div>
  );
}

function KPI({ label, value, Icon, tone = "text-ink" }: { label: string; value: string; Icon: typeof Palette; tone?: string }) {
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

function SlotCard({
  slot, onOpen, onMove, onSetStatus, onTogglePin, onDuplicate, onDelete,
}: {
  slot: Slot;
  onOpen: () => void;
  onMove: (dir: "up" | "down") => void;
  onSetStatus: (s: SlotStatus) => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[slot.type];
  const aud = AUDIENCE_META[slot.audience];
  const ctr = slot.impressions ? (slot.clicks / slot.impressions) * 100 : 0;

  return (
    <Card padded={false} className="overflow-hidden">
      <SlotPreview slot={slot} />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-md bg-black/[0.04] grid place-items-center shrink-0">
            <meta.Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={onOpen} className="font-display font-bold text-[14px] hover:underline">{slot.name}</button>
              {slot.pinned && <Pin className="h-3 w-3 text-gold fill-gold" />}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              Position {slot.position} · {meta.label} · {slot.device === "all" ? "All devices" : slot.device === "mobile" ? "Mobile only" : "Desktop only"}
            </div>
          </div>
          <StatusPill status={STATUS_LABEL[slot.status]} />
        </div>

        <div className="flex flex-wrap gap-1.5 mt-3">
          <Chip tone="neutral"><aud.Icon className="h-3 w-3" /> {aud.label}</Chip>
          {slot.device !== "all" && (
            <Chip tone="slate">
              {slot.device === "mobile" ? <Smartphone className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
              {slot.device === "mobile" ? "Mobile" : "Desktop"}
            </Chip>
          )}
          {slot.endsAt && <Chip tone="amber"><Clock className="h-3 w-3" /> Ends {new Date(slot.endsAt).toLocaleDateString()}</Chip>}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <MiniStat label="Impr." value={slot.impressions.toLocaleString()} />
          <MiniStat label="CTR" value={`${ctr.toFixed(2)}%`} />
          <MiniStat label="Revenue" value={slot.revenue ? naira(slot.revenue) : " - "} />
        </div>

        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
          <IconButton onClick={() => onMove("up")} title="Move up"><ArrowUp className="h-3.5 w-3.5" /></IconButton>
          <IconButton onClick={() => onMove("down")} title="Move down"><ArrowDown className="h-3.5 w-3.5" /></IconButton>
          <IconButton onClick={onTogglePin} title={slot.pinned ? "Unpin" : "Pin"} active={slot.pinned}>
            {slot.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </IconButton>
          {slot.status === "live" ? (
            <button onClick={() => onSetStatus("paused")} className="h-8 px-2.5 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[11.5px] font-semibold flex items-center gap-1">
              <Pause className="h-3.5 w-3.5" /> Pause
            </button>
          ) : (
            <button onClick={() => onSetStatus("live")} className="h-8 px-2.5 rounded-md border border-border bg-muted text-ink text-[11.5px] font-semibold flex items-center gap-1">
              <Play className="h-3.5 w-3.5" /> Publish
            </button>
          )}
          <IconButton onClick={onDuplicate} title="Duplicate"><Copy className="h-3.5 w-3.5" /></IconButton>
          <button onClick={onOpen} className="ml-auto h-8 px-3 rounded-md bg-ink text-white text-[11.5px] font-semibold hover:bg-black">Edit</button>
          <IconButton onClick={onDelete} title="Delete"><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      </div>
    </Card>
  );
}

function SlotPreview({ slot }: { slot: Slot }) {
  const isDark = isDarkColor(slot.imageColor);
  const textColor = isDark ? "#faf6ea" : "#0f0f0f";
  const subColor = isDark ? "rgba(250,246,234,0.72)" : "rgba(15,15,15,0.62)";
  return (
    <div className="relative h-32 overflow-hidden" style={{ background: slot.imageColor }}>
      <div className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(circle at 30% 40%, ${slot.accent}55, transparent 60%)` }} />
      <div className="relative h-full p-4 flex flex-col justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded" style={{ background: slot.accent, color: isDarkColor(slot.accent) ? "#faf6ea" : "#0f0f0f" }}>
            {slot.type}
          </span>
          {slot.status === "live" && <span className="text-[9px] uppercase tracking-[0.18em] font-bold px-1.5 py-0.5 rounded bg-ink text-white">Live</span>}
        </div>
        <div>
          <div className="font-display text-[15px] leading-tight" style={{ color: textColor }}>{slot.headline}</div>
          {slot.subhead && <div className="text-[10.5px] mt-0.5 line-clamp-1" style={{ color: subColor }}>{slot.subhead}</div>}
          {slot.cta && (
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: slot.accent, color: isDarkColor(slot.accent) ? "#faf6ea" : "#0f0f0f" }}>
              {slot.cta}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-black/[0.06] bg-[#faf8f3] py-1.5">
      <div className="font-display text-[13px] leading-tight">{value}</div>
      <div className="text-[9.5px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    </div>
  );
}

function SlotDrawer({
  slot, onClose, onSave, onSetStatus, onDuplicate, onTogglePin, onDelete,
}: {
  slot: Slot;
  onClose: () => void;
  onSave: (patch: Partial<Slot>) => void;
  onSetStatus: (s: SlotStatus) => void;
  onDuplicate: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState({ ...slot });
  const [saved, setSaved] = useState(false);
  const patch = <K extends keyof Slot>(k: K, v: Slot[K]) => setForm({ ...form, [k]: v });
  const save = () => { onSave(form); setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const ctr = slot.impressions ? (slot.clicks / slot.impressions) * 100 : 0;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <aside className="fixed right-0 top-0 bottom-0 w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col">
        <div className="h-14 px-5 border-b border-black/[0.08] flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-semibold">Slot · {form.page}</div>
            <div className="font-display font-bold text-[15px] leading-tight truncate">{form.name}</div>
          </div>
          <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex flex-wrap gap-2">
            {slot.status !== "live" && (
              <button onClick={() => onSetStatus("live")} className="h-8 px-3 rounded-md border border-border bg-muted text-ink text-[12px] font-semibold flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" /> Publish
              </button>
            )}
            {slot.status === "live" && (
              <button onClick={() => onSetStatus("paused")} className="h-8 px-3 rounded-md border border-amber-200 bg-amber-50 text-amber-700 text-[12px] font-semibold flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            <button onClick={() => onSetStatus("expired")} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Archive className="h-3.5 w-3.5" /> Archive
            </button>
            <button onClick={onTogglePin} className={`h-8 px-3 rounded-md border text-[12px] font-semibold flex items-center gap-1.5 ${slot.pinned ? "bg-gold/15 border-gold/30 text-gold-deep" : "bg-white border-black/10 hover:bg-black/[0.04]"}`}>
              {slot.pinned ? <><PinOff className="h-3.5 w-3.5" /> Unpin</> : <><Pin className="h-3.5 w-3.5" /> Pin</>}
            </button>
            <button onClick={onDuplicate} className="h-8 px-3 rounded-md border border-black/10 bg-white text-[12px] font-semibold flex items-center gap-1.5 hover:bg-black/[0.04]">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
          </div>

          <Section title="Preview">
            <Card padded={false} className="overflow-hidden">
              <SlotPreview slot={form} />
            </Card>
          </Section>

          <Section title="Basics">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Name (internal)" value={form.name} onChange={(v) => patch("name", v)} />
              <Select label="Page" value={form.page} onChange={(v) => patch("page", v as SlotPage)} options={PAGES.map((p) => ({ value: p.id, label: p.label }))} />
              <Select label="Type" value={form.type} onChange={(v) => patch("type", v as SlotType)} options={(Object.keys(TYPE_META) as SlotType[]).map((t) => ({ value: t, label: TYPE_META[t].label }))} />
              <NumberField label="Position" value={form.position} onChange={(v) => patch("position", v)} />
            </div>
          </Section>

          <Section title="Content">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="Headline" value={form.headline} onChange={(v) => patch("headline", v)} span={2} />
              <Field label="Subhead" value={form.subhead ?? ""} onChange={(v) => patch("subhead", v)} span={2} />
              <Field label="CTA label" value={form.cta ?? ""} onChange={(v) => patch("cta", v)} />
              <Field label="Link to" value={form.linkTo ?? ""} onChange={(v) => patch("linkTo", v)} />
            </div>
          </Section>

          <Section title="Look">
            <div className="grid grid-cols-2 gap-2.5">
              <ColorField label="Background" value={form.imageColor} onChange={(v) => patch("imageColor", v)} />
              <ColorField label="Accent" value={form.accent} onChange={(v) => patch("accent", v)} />
            </div>
          </Section>

          <Section title="Targeting">
            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Device" value={form.device} onChange={(v) => patch("device", v as SlotDevice)} options={[
                { value: "all", label: "All devices" },
                { value: "mobile", label: "Mobile only" },
                { value: "desktop", label: "Desktop only" },
              ]} />
              <Select label="Audience" value={form.audience} onChange={(v) => patch("audience", v as SlotAudience)} options={[
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
              <Stat label="Impressions" value={slot.impressions.toLocaleString()} />
              <Stat label="Clicks" value={slot.clicks.toLocaleString()} />
              <Stat label="CTR" value={`${ctr.toFixed(2)}%`} />
              <Stat label="Revenue" value={slot.revenue ? naira(slot.revenue) : " - "} />
            </div>
          </Section>

          <Section title="Internal notes">
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => patch("notes", e.target.value)}
              rows={3}
              placeholder="Design approval, campaign context, dependencies…"
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

function NewSlotModal({
  defaultPage, onClose, onCreate,
}: {
  defaultPage: SlotPage;
  onClose: () => void;
  onCreate: (payload: Omit<Slot, "id" | "impressions" | "clicks" | "revenue" | "createdAt" | "updatedAt" | "pinned">) => void;
}) {
  const [name, setName] = useState("");
  const [page, setPage] = useState<SlotPage>(defaultPage);
  const [type, setType] = useState<SlotType>("hero");
  const [headline, setHeadline] = useState("");

  const submit = () => {
    if (!name.trim() || !headline.trim()) return;
    onCreate({
      name: name.trim(),
      page,
      position: 99,
      type,
      status: "draft",
      device: "all",
      audience: "all",
      headline: headline.trim(),
      imageColor: "#0f0f0f",
      accent: "#c9a86a",
      startsAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 grid place-items-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="h-12 px-4 border-b border-black/[0.08] flex items-center justify-between">
            <div className="font-display font-bold text-[15px]">New slot</div>
            <IconButton onClick={onClose} title="Close"><X className="h-4 w-4" /></IconButton>
          </div>
          <div className="p-4 space-y-3">
            <Field label="Slot name" value={name} onChange={setName} span={2} />
            <div className="grid grid-cols-2 gap-2.5">
              <Select label="Page" value={page} onChange={(v) => setPage(v as SlotPage)} options={PAGES.map((p) => ({ value: p.id, label: p.label }))} />
              <Select label="Type" value={type} onChange={(v) => setType(v as SlotType)} options={(Object.keys(TYPE_META) as SlotType[]).map((t) => ({ value: t, label: TYPE_META[t].label }))} />
            </div>
            <Field label="Headline" value={headline} onChange={setHeadline} span={2} />
            <div className="text-[11.5px] text-muted-foreground">Created as draft. Configure look, targeting and schedule next.</div>
          </div>
          <div className="border-t border-black/[0.08] p-3 flex items-center gap-2">
            <button onClick={onClose} className="ml-auto h-9 px-3 rounded-md border border-black/10 bg-white text-[12.5px] font-semibold hover:bg-black/[0.04]">Cancel</button>
            <button onClick={submit} disabled={!name.trim() || !headline.trim()} className="h-9 px-4 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:bg-black disabled:opacity-40 flex items-center gap-1.5">
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
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] outline-none focus:border-ink"
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-9 rounded-md border border-black/10 bg-white px-2.5 text-[13px] tabular-nums outline-none focus:border-ink"
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

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="h-9 flex items-center gap-2 rounded-md border border-black/10 bg-white px-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-6 w-8 rounded border border-black/10 cursor-pointer" />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 bg-transparent outline-none text-[13px] font-sans uppercase" />
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
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luma < 0.55;
}
