import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "./AdminShell";
import { Card, Chip, Empty, StatusPill, Toolbar } from "./ui";
import {
  useAnnouncements, type Announcement, type AnnStatus, type AnnStyle,
  type AnnPlacement, type AnnAudience, type AnnDevice,
} from "@/lib/announcements-store";
import { downloadCSV } from "@/lib/admin-export";
import {
  Search, Plus, Trash2, Copy, X, Send, Pause, Play, Download, Calendar,
  Megaphone, ShoppingCart, Shield, Smartphone, Monitor, Globe, Users, UserCircle,
  Crown, Sparkles, Eye, EyeOff, Edit3, ChevronRight,
} from "lucide-react";

const PLACEMENT_META: Record<AnnPlacement, { label: string; Icon: typeof Megaphone; description: string }> = {
  site_top: { label: "Storefront top", Icon: Megaphone, description: "Bar shown above the site header." },
  checkout_top: { label: "Checkout top", Icon: ShoppingCart, description: "Bar shown on cart & checkout." },
  admin_top: { label: "Admin banner", Icon: Shield, description: "Internal note for staff on the admin shell." },
};

const AUDIENCE_META: Record<AnnAudience, { label: string; Icon: typeof Users }> = {
  everyone: { label: "Everyone", Icon: Globe },
  guests: { label: "Guests only", Icon: UserCircle },
  members: { label: "Members", Icon: Users },
  club_gold: { label: "Club · Gold", Icon: Crown },
  club_signature: { label: "Club · Signature", Icon: Sparkles },
};

const STYLE_PRESETS: Array<{ id: AnnStyle; label: string; bg: string; fg: string }> = [
  { id: "solid", label: "Solid dark", bg: "#0d0d0d", fg: "#ffffff" },
  { id: "gradient", label: "Gold gradient", bg: "linear-gradient(90deg,#0d0d0d,#3b2e12)", fg: "#f1d799" },
  { id: "outline", label: "Outline", bg: "#ffffff", fg: "#0d0d0d" },
  { id: "minimal", label: "Sand", bg: "#f7f2e6", fg: "#3f2f11" },
];

export function AdminAnnouncement() {
  const { items, hydrate, create, remove, duplicate, setStatus } = useAnnouncements();
  const [placement, setPlacement] = useState<AnnPlacement>("site_top");
  const [status, setStatusF] = useState<AnnStatus | "all">("all");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const scoped = useMemo(() => items.filter((i) => i.placement === placement), [items, placement]);
  const filtered = useMemo(() => scoped
    .filter((i) => status === "all" || i.status === status)
    .filter((i) => !q || `${i.title} ${i.message}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.priority - a.priority),
  [scoped, status, q]);

  const counts = useMemo(() => ({
    all: scoped.length,
    live: scoped.filter((i) => i.status === "live").length,
    scheduled: scoped.filter((i) => i.status === "scheduled").length,
    paused: scoped.filter((i) => i.status === "paused").length,
    expired: scoped.filter((i) => i.status === "expired").length,
  }), [scoped]);

  const liveOne = scoped.find((i) => i.status === "live" && i.priority === Math.max(...scoped.filter((x) => x.status === "live").map((x) => x.priority)));

  const totalImp = items.reduce((s, i) => s + i.impressions, 0);
  const totalClicks = items.reduce((s, i) => s + i.clicks, 0);
  const ctr = totalImp ? (totalClicks / totalImp) * 100 : 0;

  const selected = items.find((i) => i.id === selectedId) || null;

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      <PageHeader
        title="Announcement Bar"
        subtitle="Site-wide bars for delivery notes, previews, promos and internal notices."
        actions={
          <>
            <button
              onClick={() => downloadCSV("announcements.csv", items.map((i) => ({
                title: i.title, message: i.message, placement: i.placement, audience: i.audience,
                status: i.status, priority: i.priority, impressions: i.impressions, clicks: i.clicks,
                dismisses: i.dismisses,
              })))}
              className="h-9 px-3 rounded-md border border-black/10 text-[13px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button
              onClick={async () => { const id = await create(); setSelectedId(id); }}
              className="h-9 px-3 rounded-md bg-ink text-white text-[13px] font-semibold hover:opacity-90 flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New announcement
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Kpi label="Live · storefront" value={counts.live.toString()} tone="green" />
        <Kpi label="Scheduled" value={counts.scheduled.toString()} tone="gold" />
        <Kpi label="Impressions" value={totalImp.toLocaleString()} />
        <Kpi label="CTR" value={`${ctr.toFixed(2)}%`} />
      </div>

      {/* Currently live preview */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Currently live · storefront</div>
          {liveOne && <Chip tone="green"><Play className="h-2.5 w-2.5 fill-current" /> Live</Chip>}
        </div>
        {liveOne ? (
          <div className="space-y-2">
            <BarPreview a={liveOne} />
            <div className="text-[11.5px] text-muted-foreground">
              Priority {liveOne.priority} · {AUDIENCE_META[liveOne.audience].label} · {liveOne.impressions.toLocaleString()} impressions this month
            </div>
          </div>
        ) : (
          <div className="text-[13px] text-muted-foreground italic py-2">No live bar for storefront right now.</div>
        )}
      </Card>

      {/* Placement rail */}
      <div className="flex items-center gap-1 mb-4 bg-white border border-black/10 rounded-lg p-1 w-fit">
        {(Object.keys(PLACEMENT_META) as AnnPlacement[]).map((p) => {
          const M = PLACEMENT_META[p];
          return (
            <button key={p} onClick={() => setPlacement(p)}
              className={`h-8 px-3 rounded-md text-[12.5px] font-semibold flex items-center gap-1.5 ${
                placement === p ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
              }`}>
              <M.Icon className="h-3.5 w-3.5" /> {M.label}
              <span className={placement === p ? "text-white/70" : "text-muted-foreground/70"}>
                {items.filter((i) => i.placement === p).length}
              </span>
            </button>
          );
        })}
      </div>
      <div className="text-[12px] text-muted-foreground mb-3">{PLACEMENT_META[placement].description}</div>

      <Toolbar>
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search title or message…"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
          />
        </div>
        <div className="flex items-center gap-1 bg-white border border-black/10 rounded-md p-0.5">
          {(["all", "live", "scheduled", "paused", "expired"] as const).map((s) => (
            <button key={s}
              onClick={() => setStatusF(s)}
              className={`h-7 px-2.5 rounded text-[12px] font-semibold capitalize ${
                status === s ? "bg-ink text-white" : "text-muted-foreground hover:text-ink"
              }`}>
              {s}
              <span className="opacity-60 ml-1">{counts[s as keyof typeof counts]}</span>
            </button>
          ))}
        </div>
      </Toolbar>

      {/* List */}
      {filtered.length === 0 ? (
        <Card><Empty title="No announcements" sub="Create one to start showing bars in this placement." /></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <Card key={a.id} className="!p-0">
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="font-semibold text-ink text-[14px] truncate">{a.title}</div>
                    <StatusPill status={a.status} />
                    <Chip>Priority {a.priority}</Chip>
                    <Chip>{AUDIENCE_META[a.audience].label}</Chip>
                    {a.device !== "all" && (
                      <Chip>
                        {a.device === "mobile" ? <Smartphone className="h-2.5 w-2.5" /> : <Monitor className="h-2.5 w-2.5" />}
                        {a.device}
                      </Chip>
                    )}
                  </div>
                  <div className="mb-2"><BarPreview a={a} /></div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-muted-foreground">
                    {a.startsAt && <span>Starts {new Date(a.startsAt).toLocaleDateString()}</span>}
                    {a.endsAt && <span>Ends {new Date(a.endsAt).toLocaleDateString()}</span>}
                    <span>{a.impressions.toLocaleString()} impressions</span>
                    <span>{a.clicks.toLocaleString()} clicks</span>
                    <span>{a.dismisses.toLocaleString()} dismissed</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.status === "live" ? (
                    <button onClick={() => setStatus(a.id, "paused")} title="Pause"
                      className="h-8 w-8 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"><Pause className="h-3.5 w-3.5" /></button>
                  ) : (
                    <button onClick={() => setStatus(a.id, "live")} title="Set live"
                      className="h-8 w-8 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"><Play className="h-3.5 w-3.5" /></button>
                  )}
                  <button onClick={() => setSelectedId(a.id)} title="Edit"
                    className="h-8 w-8 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"><Edit3 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => duplicate(a.id)} title="Duplicate"
                    className="h-8 w-8 grid place-items-center rounded-md border border-black/10 hover:bg-black/[0.04]"><Copy className="h-3.5 w-3.5" /></button>
                  <button onClick={() => { if (confirm("Delete this announcement?")) remove(a.id); }} title="Delete"
                    className="h-8 w-8 grid place-items-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selected && <AnnouncementDrawer a={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "green" | "gold" }) {
  const tones = { neutral: "text-ink", green: "text-ink", gold: "text-gold-deep" } as const;
  return (
    <Card>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={`font-display text-[26px] leading-none mt-1.5 ${tones[tone]}`}>{value}</div>
    </Card>
  );
}

function BarPreview({ a }: { a: Announcement }) {
  const isGradient = a.style === "gradient";
  const isOutline = a.style === "outline";
  return (
    <div
      className={`w-full rounded-md px-4 py-2.5 flex items-center justify-center gap-2 text-[12.5px] font-medium ${
        isOutline ? "border border-black/15" : ""
      }`}
      style={isGradient ? { background: a.bg, color: a.fg } : { backgroundColor: a.bg, color: a.fg }}
    >
      
      <span className="text-center">{a.message}</span>
      {a.ctaLabel && (
        <span className="ml-1 inline-flex items-center gap-1 underline underline-offset-2 font-semibold">
          {a.ctaLabel} <ChevronRight className="h-3 w-3" />
        </span>
      )}
      {a.dismissible && <X className="h-3.5 w-3.5 opacity-70 ml-auto" />}
    </div>
  );
}

function AnnouncementDrawer({ a, onClose }: { a: Announcement; onClose: () => void }) {
  const { update, setStatus, remove } = useAnnouncements();
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button onClick={onClose} className="absolute inset-0 bg-black/40" aria-label="Close" />
      <div className="relative w-full max-w-[820px] bg-[#f7f5ef] h-full overflow-y-auto border-l border-black/10">
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-5 py-3 border-b border-black/[0.08] flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <input
                value={a.title} onChange={(e) => update(a.id, { title: e.target.value })}
                className="font-display text-[16px] font-bold bg-transparent outline-none border-b border-transparent focus:border-ink/30 min-w-0 flex-1"
              />
              <StatusPill status={a.status} />
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              Updated {new Date(a.updatedAt).toLocaleString()}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {a.status !== "live" ? (
              <button onClick={() => setStatus(a.id, "live")}
                className="h-8 px-3 rounded-md bg-ink text-white text-[12.5px] font-semibold hover:opacity-90 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5" /> Set live
              </button>
            ) : (
              <button onClick={() => setStatus(a.id, "paused")}
                className="h-8 px-3 rounded-md border border-black/10 text-[12.5px] font-semibold hover:bg-black/[0.04] flex items-center gap-1.5">
                <Pause className="h-3.5 w-3.5" /> Pause
              </button>
            )}
            <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-md hover:bg-black/[0.06]"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="p-5 grid grid-cols-[1fr_300px] gap-4">
          {/* Left: content */}
          <div className="space-y-3">
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Preview</div>
              <BarPreview a={a} />
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Message</div>
              <textarea
                rows={2} value={a.message} onChange={(e) => update(a.id, { message: e.target.value })}
                className="w-full px-3 py-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
              />
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Call to action</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={a.ctaLabel ?? ""} onChange={(e) => update(a.id, { ctaLabel: e.target.value })}
                  placeholder="Shop now"
                  className="h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
                />
                <input
                  value={a.ctaHref ?? ""} onChange={(e) => update(a.id, { ctaHref: e.target.value })}
                  placeholder="/shop or https://…"
                  className="h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink font-sans"
                />
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Style</div>
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {STYLE_PRESETS.map((p) => (
                  <button key={p.id}
                    onClick={() => update(a.id, { style: p.id, bg: p.bg, fg: p.fg })}
                    className={`h-10 rounded-md border text-[11.5px] font-semibold ${
                      a.style === p.id ? "border-ink ring-2 ring-ink/20" : "border-black/10 hover:bg-black/[0.04]"
                    }`}
                    style={p.id === "gradient" ? { background: p.bg, color: p.fg } : { backgroundColor: p.bg, color: p.fg }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[11.5px] text-muted-foreground">
                  Background
                  <input value={a.bg} onChange={(e) => update(a.id, { bg: e.target.value })}
                    className="mt-1 w-full h-9 px-2 rounded-md bg-white border border-black/10 text-[12px] font-sans outline-none focus:border-ink" />
                </label>
                <label className="text-[11.5px] text-muted-foreground">
                  Text colour
                  <input value={a.fg} onChange={(e) => update(a.id, { fg: e.target.value })}
                    className="mt-1 w-full h-9 px-2 rounded-md bg-white border border-black/10 text-[12px] font-sans outline-none focus:border-ink" />
                </label>
              </div>
            </Card>
          </div>

          {/* Right: targeting */}
          <div className="space-y-3">
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Placement</div>
              <select
                value={a.placement} onChange={(e) => update(a.id, { placement: e.target.value as AnnPlacement })}
                className="w-full h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
              >
                {(Object.keys(PLACEMENT_META) as AnnPlacement[]).map((p) =>
                  <option key={p} value={p}>{PLACEMENT_META[p].label}</option>)}
              </select>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Audience</div>
              <select
                value={a.audience} onChange={(e) => update(a.id, { audience: e.target.value as AnnAudience })}
                className="w-full h-9 px-2 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
              >
                {(Object.keys(AUDIENCE_META) as AnnAudience[]).map((k) =>
                  <option key={k} value={k}>{AUDIENCE_META[k].label}</option>)}
              </select>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Device</div>
              <div className="flex gap-1.5">
                {(["all", "mobile", "desktop"] as const).map((d) => (
                  <button key={d} onClick={() => update(a.id, { device: d as AnnDevice })}
                    className={`flex-1 h-9 rounded-md border text-[12px] font-semibold capitalize ${
                      a.device === d ? "bg-ink text-white border-ink" : "bg-white border-black/10 hover:bg-black/[0.04]"
                    }`}>{d}</button>
                ))}
              </div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Priority</div>
              <input
                type="number" min={1} max={20}
                value={a.priority} onChange={(e) => update(a.id, { priority: Number(e.target.value) || 1 })}
                className="w-full h-9 px-3 rounded-md bg-white border border-black/10 text-[13px] outline-none focus:border-ink"
              />
              <div className="text-[11px] text-muted-foreground mt-1">Higher priority wins when multiple bars qualify.</div>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Schedule</div>
              <div className="space-y-2 text-[12px]">
                <label>
                  <div className="text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Starts</div>
                  <input type="datetime-local"
                    value={a.startsAt ? a.startsAt.slice(0, 16) : ""}
                    onChange={(e) => update(a.id, { startsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full h-9 px-2 rounded-md bg-white border border-black/10 outline-none focus:border-ink" />
                </label>
                <label>
                  <div className="text-muted-foreground mb-0.5 flex items-center gap-1"><Calendar className="h-3 w-3" /> Ends</div>
                  <input type="datetime-local"
                    value={a.endsAt ? a.endsAt.slice(0, 16) : ""}
                    onChange={(e) => update(a.id, { endsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full h-9 px-2 rounded-md bg-white border border-black/10 outline-none focus:border-ink" />
                </label>
              </div>
            </Card>
            <Card>
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={a.dismissible}
                  onChange={(e) => update(a.id, { dismissible: e.target.checked })} />
                Dismissible by user
              </label>
            </Card>
            <Card>
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Performance</div>
              <div className="space-y-1.5 text-[12.5px]">
                <Row label="Impressions" value={a.impressions.toLocaleString()} />
                <Row label="Clicks" value={a.clicks.toLocaleString()} />
                <Row label="Dismisses" value={a.dismisses.toLocaleString()} />
                <Row label="CTR" value={`${a.impressions ? ((a.clicks / a.impressions) * 100).toFixed(2) : "0.00"}%`} />
              </div>
            </Card>
            <Card className="border-rose-200 bg-rose-50/40">
              <button onClick={() => { if (confirm("Delete this announcement?")) { remove(a.id); onClose(); } }}
                className="w-full h-9 px-3 rounded-md bg-white border border-rose-200 text-rose-700 text-[12.5px] font-semibold hover:bg-rose-100 flex items-center justify-center gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Delete announcement
              </button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-ink tabular-nums">{value}</span>
    </div>
  );
}
